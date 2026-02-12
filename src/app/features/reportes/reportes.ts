import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, HostListener, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegranteService } from '../../core/services/integrante';
import { Integrante, MemberFilterRequestDto } from '../../core/models/integrante.model';
import { AsistenciaService } from '../../core/services/asistencia';
import { ReporteService } from '../../core/services/reporte';
import { ReportFilters, ReportData } from '../../core/models/reporte.model';
import { IglesiaService } from '../../core/models/asistencia.model';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { ReportService, ReportColumn } from '../../core/services/report.service';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { NotificationService } from '../../core/services/notification.service';
import { MemberConfigService } from '../../core/services/member-config.service';
import { ThemeService } from '../../core/services/theme.service';
import { MemberCategoryResponseDto, MemberTypeResponseDto } from '../../core/models/member-config.model';
import { forkJoin } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid,
  ApexTooltip,
  ApexPlotOptions
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
};

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, DragDropModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  providers: [DatePipe]
})
export class Reportes implements OnInit {
  private integranteService = inject(IntegranteService);
  private asistenciaService = inject(AsistenciaService);
  private reporteService = inject(ReporteService);
  private reportService = inject(ReportService);
  private datePipe = inject(DatePipe);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  private memberConfigService = inject(MemberConfigService);
  private themeService = inject(ThemeService);

  @ViewChild("chart") chart!: ChartComponent;

  // States
  showFilterModal = false;
  isLoading = false;
  renderChart = false;
  services: IglesiaService[] = [];
  reportData: ReportData[] = [];

  protected readonly Math = Math;

  // Metrics
  stats = {
    totalAttendance: 0,
    peakAttendance: 0,
    avgAttendance: 0,
    topCategory: { name: '-', value: 0 }
  };

  // Pagination for Chart Performance
  currentPage = 0;
  pageSize = 15;
  totalStatsCalculated = false;
  allXLabels: string[] = [];
  allSeries: any[] = [];
  filters: any = {
    onlyActive: true,
    typeOfPeople: undefined,
    category: undefined,
    serviceId: undefined,
    startDate: '',
    endDate: '',
    userId: ''
  };

  // Member Search in Filters
  memberSearchQuery = '';
  memberResults: any[] = [];
  selectedMemberName = '';
  isSearchingMembers = false;

  // Report Personalization
  showReportModal = false;
  exportLoading = false;
  reportColumns: ReportColumn[] = [
    { id: 'date', label: 'Fecha', visible: true, order: 0 },
    { id: 'serviceName', label: 'Servicio', visible: true, order: 1 },
    { id: 'category', label: 'Categoría', visible: true, order: 2 },
    { id: 'typePeople', label: 'Tipo', visible: true, order: 3 },
    { id: 'total', label: 'Total', visible: true, order: 4 }
  ];
  groupBy: string = '';

  // Enums (Now dynamic)
  tipos: MemberTypeResponseDto[] = [];
  categorias: MemberCategoryResponseDto[] = [];

  // Chart
  public chartOptions: any;

  ngOnInit() {
    this.adjustPageSize();
    this.chartOptions = this.getPremiumChartOptions([], [], this.themeService.isDarkMode());
    this.loadServices();
    this.loadMemberConfigs();

    // Recover cached data if any
    if (this.reporteService.lastReportData) {
      this.reportData = this.reporteService.lastReportData;
      this.filters = { ...this.reporteService.lastFilters };
      this.stats = { ...this.reporteService.lastStats };
      if (this.reporteService.lastMemberSelection) {
        this.selectedMemberName = this.reporteService.lastMemberSelection.name;
      }
      this.updateChart();
    }

    // Effect to react to theme changes
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      if (this.reportData.length > 0) {
        this.updateChart();
      } else {
        this.chartOptions = this.getPremiumChartOptions([], [], isDark);
      }
    });
  }

  loadMemberConfigs() {
    forkJoin({
      categories: this.memberConfigService.getCategories(),
      types: this.memberConfigService.getTypes()
    }).subscribe({
      next: (res) => {
        this.categorias = res.categories;
        this.tipos = res.types;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading member configurations:', err);
        this.notificationService.error('Error al cargar las categorías y tipos.');
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.adjustPageSize();
    if (this.reportData.length > 0) {
      this.updateChart();
    }
  }

  adjustPageSize() {
    this.pageSize = window.innerWidth <= 768 ? 5 : 15;
  }

  loadServices() {
    this.asistenciaService.getServices(false).subscribe(data => {
      this.services = data;
    });
  }

  private getPremiumChartOptions(series: any[], categories: string[], isDark: boolean): any {
    const safeSeries = (series && series.length > 0) ? series : [{ name: 'Sin Datos', data: [] }];
    const safeCategories = (categories && categories.length > 0) ? categories : ['-'];

    return {
      series: safeSeries,
      chart: {
        height: 450,
        type: "bar",
        stacked: true,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        },
        fontFamily: 'Inter, sans-serif'
      },
      theme: {
        mode: isDark ? 'dark' : 'light'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 6,
          dataLabels: {
            total: {
              enabled: false
            }
          }
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '10px',
          fontWeight: 'bold',
          colors: ['#ffffff']
        },
        dropShadow: {
            enabled: true,
            top: 1,
            left: 1,
            blur: 1,
            color: '#000',
            opacity: 0.45
        },
        formatter: function (val: number) {
          return val > 0 ? val : '';
        }
      },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        type: 'category',
        categories: safeCategories,
        labels: {
          show: true,
          rotate: -90,
          rotateAlways: true,
          style: {
            fontSize: '11px',
            cssClass: 'chart-xaxis-label'
          },
          trim: false,
          minHeight: 100,
          maxHeight: 180,
          hideOverlappingLabels: false
        },
        axisBorder: { show: true, color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
        axisTicks: { show: true, color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
        tooltip: { enabled: false }
      },
      yaxis: {
        title: { 
          text: 'Asistencia',
          style: { color: isDark ? '#f8fafc' : '#1e293b' }
        },
        labels: {
          style: { fontSize: '11px' }
        },
        min: 0,
        forceNiceScale: true
      },
      fill: {
        opacity: 1
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '13px',
        fontWeight: 600,
        labels: {
          fontSize: '13px'
        },
        markers: { radius: 12 }
      },
      grid: {
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } }
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        shared: true,
        intersect: false,
        x: {
          show: true,
          formatter: (val: any) => {
            if (typeof val === 'number') {
              return categories[val - 1] || `Servicio ${val}`;
            }
            return val;
          }
        }
      },
      colors: ['#10b981', '#3b82f6', '#f472b6', '#fbbf24', '#6366f1']
    };
  }

  openFilterModal() {
    this.showFilterModal = true;
  }

  closeFilterModal() {
    this.showFilterModal = false;
    this.memberResults = [];
    this.memberSearchQuery = '';
  }

  onMemberSearch() {
    if (!this.memberSearchQuery || this.memberSearchQuery.length < 2) {
      this.memberResults = [];
      return;
    }

    this.isSearchingMembers = true;
    const filterRequest: MemberFilterRequestDto = {
      onlyActive: true,
      query: this.memberSearchQuery
    };
    this.integranteService.searchMembers(filterRequest, 0).subscribe({
      next: (res) => {
        this.memberResults = res.members;
        this.isSearchingMembers = false;
      },
      error: () => {
        this.isSearchingMembers = false;
        this.memberResults = [];
      }
    });
  }

  selectMember(member: any) {
    this.filters.userId = member.id;
    this.selectedMemberName = member.completeName;
    this.reporteService.lastMemberSelection = { id: member.id, name: member.completeName };
    this.memberResults = [];
    this.memberSearchQuery = '';
  }

  clearMemberSelection() {
    this.filters.userId = '';
    this.selectedMemberName = '';
    this.reporteService.lastMemberSelection = null;
    this.memberResults = [];
    this.memberSearchQuery = '';
  }

  applyFilters() {
    this.isLoading = true;

    const reportFilters: ReportFilters = {
      onlyActive: this.filters.onlyActive,
      userId: this.filters.userId || undefined,
      typePeoples: this.filters.typeOfPeople ? [this.filters.typeOfPeople] : undefined,
      categories: this.filters.category ? [this.filters.category] : undefined,
      serviceIds: this.filters.serviceId ? [this.filters.serviceId] : undefined,
    };

    const formatDateTime = (val: string) => {
      if (!val) return undefined;
      if (!val.includes('T')) return `${val}T00:00:00`;
      if (val.split(':').length === 2) return `${val}:00`;
      return val;
    };

    reportFilters.startDate = formatDateTime(this.filters.startDate);
    reportFilters.endDate = formatDateTime(this.filters.endDate);

    this.reporteService.generateReport(reportFilters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.calculateStats();
        
        // Save to persistence
        this.reporteService.lastReportData = data;
        this.reporteService.lastFilters = { ...this.filters };
        this.reporteService.lastStats = { ...this.stats };
        
        this.updateChart();
        this.isLoading = false;
        this.closeFilterModal();
      },
      error: (err) => {
        console.error('Error fetching report:', err);
        this.isLoading = false;
      }
    });
  }

  updateChart() {
    if (!this.reportData || this.reportData.length === 0) {
      this.renderChart = false;
      this.resetStats();
      this.cdr.detectChanges();
      return;
    }

    this.calculateStats();

    const serviceMap = new Map<string, string>();
    this.reportData.forEach(d => {
      const key = d.serviceTime || `${d.date}_${d.serviceName}`;
      if (!serviceMap.has(key)) {
        let displayInfo = d.date;
        if (d.serviceTime && d.serviceTime.includes('T')) {
          const time = d.serviceTime.split('T')[1].substring(0, 5);
          displayInfo = `${d.date} ${time}`;
        }
        serviceMap.set(key, `${displayInfo} - ${d.serviceName}`);
      }
    });

    const sortedKeys = Array.from(serviceMap.keys()).sort();
    this.allXLabels = sortedKeys.map(key => serviceMap.get(key)!);
    const getCatName = (d: any) => typeof d.category === 'string' ? d.category : d.category?.name;
    const seriesCategories = Array.from(new Set(this.reportData.map(d => getCatName(d)))).sort();

    this.allSeries = seriesCategories.map(cat => {
      const dataPoints = sortedKeys.map(key => {
        const matches = this.reportData.filter(d =>
          (d.serviceTime === key || `${d.date}_${d.serviceName}` === key) && getCatName(d) === cat
        );
        return matches.reduce((sum, item) => sum + (item.total || 0), 0);
      });
      return { name: cat, data: dataPoints };
    });

    this.renderChartPage();
  }

  renderChartPage() {
    this.renderChart = false;
    this.cdr.detectChanges();

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;

    const pagedLabels = this.allXLabels.slice(start, end);
    const pagedSeries = this.allSeries.map(s => ({
      name: s.name,
      data: s.data.slice(start, end)
    }));

    setTimeout(() => {
      this.chartOptions = this.getPremiumChartOptions(pagedSeries, pagedLabels, this.themeService.isDarkMode());
      this.renderChart = true;
      this.cdr.detectChanges();
    }, 50);
  }

  nextPage() {
    if ((this.currentPage + 1) * this.pageSize < this.allXLabels.length) {
      this.currentPage++;
      this.renderChartPage();
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.renderChartPage();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.allXLabels.length / this.pageSize);
  }

  private calculateStats() {
    const total = this.reportData.reduce((sum, d) => sum + (d.total || 0), 0);
    const serviceTotals = new Map<string, number>();
    const catTotals = new Map<string, number>();

    this.reportData.forEach(d => {
      const sKey = d.serviceTime || `${d.date}_${d.serviceName}`;
      serviceTotals.set(sKey, (serviceTotals.get(sKey) || 0) + (d.total || 0));
      const catName = typeof d.category === 'string' ? d.category : (d.category as any)?.name;
      catTotals.set(catName, (catTotals.get(catName) || 0) + (d.total || 0));
    });

    const peaks = Array.from(serviceTotals.values());
    const peak = peaks.length > 0 ? Math.max(...peaks) : 0;
    const avg = peaks.length > 0 ? total / peaks.length : 0;

    let topCat = { name: '-', value: 0 };
    catTotals.forEach((val, key) => {
      if (val > topCat.value) topCat = { name: key, value: val };
    });

    this.stats = {
      totalAttendance: total,
      peakAttendance: peak,
      avgAttendance: Math.round(avg),
      topCategory: topCat
    };
  }

  private resetStats() {
    this.stats = {
      totalAttendance: 0,
      peakAttendance: 0,
      avgAttendance: 0,
      topCategory: { name: '-', value: 0 }
    };
  }

  isExporting = false;

  openReportModal() {
    if (!this.reportData || this.reportData.length === 0) return;
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  dropColumn(event: CdkDragDrop<ReportColumn[]>) {
    moveItemInArray(this.reportColumns, event.previousIndex, event.currentIndex);
    this.reportColumns.forEach((col, index) => col.order = index);
  }

  exportReport(format: 'excel' | 'pdf') {
    if (!this.reportData || this.reportData.length === 0) return;

    this.exportLoading = true;
    const fileName = `Reporte_Asistencia_${this.datePipe.transform(new Date(), 'yyyyMMdd_HHmm')}`;

    if (format === 'excel') {
      this.reportService.exportToExcel(this.reportData, this.reportColumns, fileName, this.groupBy || undefined);
    } else {
      this.reportService.exportToPdf(this.reportData, this.reportColumns, fileName, 'Reporte de Asistencias', this.groupBy || undefined);
    }

    this.exportLoading = false;
    this.closeReportModal();
  }

  downloadReport() {
    this.openReportModal();
  }
}
