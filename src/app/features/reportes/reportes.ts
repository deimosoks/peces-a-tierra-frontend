import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, HostListener, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegranteService } from '../../core/services/integrante';
import { Integrante, MemberFilterRequestDto } from '../../core/models/integrante.model';
import { AsistenciaService } from '../../core/services/asistencia';
import { ReporteService } from '../../core/services/reporte';
import { ReportFilters, ReportData } from '../../core/models/reporte.model';
import { IglesiaService } from '../../core/models/asistencia.model';
import { BranchService } from '../../core/services/branch.service';
import { Branch } from '../../core/models/branch.model';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { ReportService, ReportColumn } from '../../core/services/report.service';
import { ServiceEvent } from '../../core/models/service-event.model'; // Added
import { ServiceCalendarComponent } from '../../shared/components/service-calendar/service-calendar.component'; // Added
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
  imports: [CommonModule, FormsModule, NgApexchartsModule, DragDropModule, ServiceCalendarComponent],
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
  private branchService = inject(BranchService);

  @ViewChild("chart") chart!: ChartComponent;

  // States
  showFilterModal = false;
  showCalendarModal = false; // Added
  isLoading = false;
  renderChart = false;
  services: IglesiaService[] = [];
  branches: Branch[] = [];
  reportData: ReportData[] = [];

  // Widget Data
  branchWidgetData: { name: string, total: number }[] = [];
  categoryWidgetData: { name: string, total: number }[] = [];
  topMembersWidgetData: { name: string, total: number }[] = [];

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
    subCategory: undefined,
    serviceId: undefined,
    branchId: undefined,
    groupBy: ['BRANCH'], // Default: Por Sede
    startDate: '', // Will be set in ngOnInit
    endDate: '',   // Will be set in ngOnInit
    userId: '',
    eventId: '' // Added
  };

  selectedEventLabel = ''; // Added

  groupByOptions = [
    { id: 'BRANCH', label: 'Por Sede' },
    { id: 'CATEGORY', label: 'Por Categoría' },
    { id: 'SUBCATEGORY', label: 'Por Sub-Categoría' },
    { id: 'TYPE', label: 'Por Tipo' },
    { id: 'SERVICE', label: 'Por Servicio' }
  ];

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
    { id: 'branchName', label: 'Sede', visible: true, order: 1 },
    { id: 'serviceName', label: 'Servicio', visible: true, order: 2 },
    { id: 'category', label: 'Categoría', visible: true, order: 3 },
    { id: 'subCategory', label: 'Sub-categoría', visible: true, order: 4 },
    { id: 'typePeople', label: 'Tipo', visible: true, order: 5 },
    { id: 'total', label: 'Total', visible: true, order: 6 }
  ];
  groupBy: string = '';
  includeTotals = true; // Added
  separateByDate = false; // Added

  // Enums (Now dynamic)
  tipos: MemberTypeResponseDto[] = [];
  categorias: MemberCategoryResponseDto[] = [];

  get availableSubCategories(): any[] {
    if (!this.filters.category) return [];
    const category = this.categorias.find(c => c.id === this.filters.category);
    return category?.subCategories || [];
  }

  // Chart
  public chartOptions: any;

  private themeEffect = effect(() => {
    const isDark = this.themeService.isDarkMode();
    if (this.reportData.length > 0) {
      this.updateChart();
    } else {
      this.chartOptions = this.getPremiumChartOptions([], [], isDark);
    }
  });

  ngOnInit() {
    this.adjustPageSize();
    this.chartOptions = this.getPremiumChartOptions([], [], this.themeService.isDarkMode());
    this.loadServices();
    this.loadBranches();
    this.loadMemberConfigs();

    // Set Default Date Range (Today)
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    this.filters.startDate = this.toLocalISOString(start);
    this.filters.endDate = this.toLocalISOString(end);

    // Default Analytics: Load data immediately
    this.applyFilters();
  }

  private toLocalISOString(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  }

  loadBranches() {
    this.branchService.findAll().subscribe(data => {
      this.branches = data;
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
              enabled: true,
              style: {
                fontWeight: 900,
                color: isDark ? '#ffffff' : '#000000'
              }
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
          formatter: (val: string) => {
            if (this.separateByDate && val && val.includes('-')) {
              const day = val.split(' ')[0].split('-')[2];
              return day || val;
            }
            return val;
          },
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
              return categories[val - 1] || `${val}`;
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

    // Map filters to DTO
    const reportFilters: ReportFilters = {
      onlyActive: this.filters.onlyActive,
      userId: this.filters.userId || undefined,
      typePeoples: this.filters.typeOfPeople ? [this.filters.typeOfPeople] : undefined,
      categories: this.filters.category ? [this.filters.category] : undefined,
      subCategories: this.filters.subCategory ? [this.filters.subCategory] : undefined,
      serviceIds: this.filters.serviceId ? [this.filters.serviceId] : undefined,
      branchIds: this.filters.branchId ? [this.filters.branchId] : undefined, // Added branchId
      eventId: this.filters.eventId || undefined, // Added eventId
      groupBy: this.getFinalGroupBy() // Uses helper to combine filters.groupBy + chartBreakdown
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
        
        this.calculateWidgetData(); // Added
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

    // Determine X-Axis labels based on grouping match
    // Default X-Axis is Time/Service unless grouped by something else exclusively
    const hasTimeGrouping = !this.filters.groupBy || this.filters.groupBy.includes('DATE') || this.filters.groupBy.includes('SERVICE') || this.separateByDate;

    const xAxisMap = new Map<string, string>();
    
    this.reportData.forEach(d => {
      let key = '';
      let display = '';

      if (hasTimeGrouping) {
        key = d.serviceTime || `${d.date}_${d.serviceName}`;
        
        let displayInfo = d.date || '';
        if (d.serviceTime && d.serviceTime.includes('T')) {
          const time = d.serviceTime.split('T')[1].substring(0, 5);
          displayInfo = `${d.date} ${time}`;
        }
        display = `${displayInfo} ${d.serviceName ? '- ' + d.serviceName : ''}`;
      } else {
        // If not grouped by time, use primary grouping as X-axis (e.g. Branch Name)
        if (this.filters.groupBy.includes('BRANCH')) {
             key = d.branchName || 'Sin Sede';
             display = d.branchName || 'Sin Sede';
        } else if (this.filters.groupBy.includes('CATEGORY')) {
             key = typeof d.category === 'string' ? d.category : (d.category?.name || 'Sin Categoría');
             display = key;
        } else {
             key = 'Total';
             display = 'Total';
        }
      }
     
      if (!xAxisMap.has(key)) {
        xAxisMap.set(key, display);
      }
    });

    const sortedKeys = Array.from(xAxisMap.keys()).sort();
    this.allXLabels = sortedKeys.map(key => xAxisMap.get(key)!);

    // Determine Series (Stacking)
    // If grouped by Category/Sub/Type/Branch (and they are not X-axis), they become series
    // Logic:
    // - If X is Time -> Series are Categories/Branches

    const getSeriesName = (d: any) => {
        // If separation is active, stack by category ONLY if data is available
        if (this.separateByDate) {
            if (d.category) {
                const cat = typeof d.category === 'string' ? d.category : (d.category?.name || 'Sin Categoría');
                const sub = d.subCategory;
                return sub ? `${cat} • ${sub}` : cat;
            }
            return 'Total';
        }

        // Default logic for other groupings
        let parts = [];
        if (this.filters.groupBy?.includes('BRANCH') && hasTimeGrouping) parts.push(d.branchName || '-');
        if (this.filters.groupBy?.includes('CATEGORY')) {
             const catName = typeof d.category === 'string' ? d.category : (d.category?.name || '-');
             parts.push(catName);
        }
        if (this.filters.groupBy?.includes('SUBCATEGORY')) parts.push(d.subCategory || '-');
        if (this.filters.groupBy?.includes('TYPE')) {
            const typeName = typeof d.typePeople === 'string' ? d.typePeople : (d.typePeople?.name || '-');
            parts.push(typeName);
        }

        return parts.length > 0 ? parts.join(' • ') : 'Total';
    };

    const seriesNames = Array.from(new Set(this.reportData.map(d => getSeriesName(d)))).sort();

    this.allSeries = seriesNames.map(seriesName => {
      const dataPoints = sortedKeys.map(key => {
        // Filter match X-axis AND match Series
        const matches = this.reportData.filter(d => {
             // 1. Match X-Axis
             let xMatch = false;
             if (hasTimeGrouping) {
                 const dKey = d.serviceTime || `${d.date}_${d.serviceName}`;
                 xMatch = dKey === key;
             } else if (this.filters.groupBy?.includes('BRANCH')) {
                 xMatch = (d.branchName || 'Sin Sede') === key;
             } else if (this.filters.groupBy?.includes('CATEGORY')) {
                  const dKey = typeof d.category === 'string' ? d.category : (d.category?.name || 'Sin Categoría');
                  xMatch = dKey === key;
             } else {
                 xMatch = true;
             }

             // 2. Match Series
             return xMatch && getSeriesName(d) === seriesName;
        });

        return matches.reduce((sum, item) => sum + (item.total || 0), 0);
      });
      return { name: seriesName, data: dataPoints };
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
    
    // Calculate peaks dependent on grouping
    // If detailed (Time), peak is max per service
    // If aggregate (Branch), peak is max per branch
    const groupingKey = (d: any) => {
        if (d.serviceTime) return d.serviceTime;
        if (d.date) return d.date + (d.serviceName || '');
        if (d.branchName) return d.branchName;
        return 'Total';
    };

    const groupTotals = new Map<string, number>();
    const catTotals = new Map<string, number>();

    this.reportData.forEach(d => {
      const gKey = groupingKey(d);
      groupTotals.set(gKey, (groupTotals.get(gKey) || 0) + (d.total || 0));
      
      if (d.category) {
          const catName = typeof d.category === 'string' ? d.category : (d.category?.name || '-');
          const key = d.subCategory ? `${catName} • ${d.subCategory}` : catName;
          catTotals.set(key, (catTotals.get(key) || 0) + (d.total || 0));
      }
    });

    const peaks = Array.from(groupTotals.values());
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

  getFinalGroupBy(): string[] | undefined {
    let groups = this.filters.groupBy ? [...this.filters.groupBy] : [];
    
    return groups.length > 0 ? groups : undefined;
  }

  private calculateWidgetData() {
    // 1. Branch Data
    const branchMap = new Map<string, number>();
    this.reportData.forEach(d => {
      const name = d.branchName || 'Sin Sede';
      branchMap.set(name, (branchMap.get(name) || 0) + (d.total || 0));
    });
    this.branchWidgetData = Array.from(branchMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 2. Category Data
    const categoryMap = new Map<string, number>();
    this.reportData.forEach(d => {
      const name = typeof d.category === 'string' ? d.category : (d.category?.name || 'Sin Categoría');
      categoryMap.set(name, (categoryMap.get(name) || 0) + (d.total || 0));
    });
    this.categoryWidgetData = Array.from(categoryMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 3. Top Series/Trends (if any other dimension exists, otherwise just repeat category/branch)
    // Actually, if we had member specific data in reportData, we'd use it. 
    // For now let's use Type of People as the 3rd widget if relevant.
    const typeMap = new Map<string, number>();
    this.reportData.forEach(d => {
       const name = typeof d.typePeople === 'string' ? d.typePeople : (d.typePeople?.name || 'Otro');
       typeMap.set(name, (typeMap.get(name) || 0) + (d.total || 0));
    });
    this.topMembersWidgetData = Array.from(typeMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
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

    // Filter columns based on data presence or grouping
    // We only include columns that have at least one valid value in the dataset
    // AND 'total' column
    const columnsWithData = this.reportColumns.filter(col => {
      if (col.id === 'total') return true;
      // Check if any row has value for this column
      return this.reportData.some(row => {
        const val = (row as any)[col.id];
        return val !== undefined && val !== null && val !== '';
      });
    });

    if (format === 'excel') {
      this.reportService.exportToExcel(this.reportData, columnsWithData, fileName, this.groupBy || (this.separateByDate ? 'date' : undefined), this.includeTotals, this.separateByDate);
    } else {
      this.reportService.exportToPdf(this.reportData, columnsWithData, fileName, 'Reporte de Asistencias', this.groupBy || (this.separateByDate ? 'date' : undefined), this.includeTotals, this.separateByDate);
    }

    this.exportLoading = false;
    this.closeReportModal();
  }

  downloadReport() {
    this.openReportModal();
  }

  // Event Selection Methods
  openCalendarModal() {
    this.showCalendarModal = true;
  }

  closeCalendarModal() {
    this.showCalendarModal = false;
  }

  onEventSelected(event: ServiceEvent) {
    this.filters.eventId = event.id;
    const eventTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eventDate = new Date(event.startDateTime).toLocaleDateString();
    this.selectedEventLabel = `${event.serviceName} (${eventDate} ${eventTime})`;
    this.showCalendarModal = false;
  }

  onGroupByChange(id: string, event: any) {
    const checked = event.target.checked;
    if (!this.filters.groupBy) this.filters.groupBy = [];
    
    if (checked) {
      if (!this.filters.groupBy.includes(id)) {
        this.filters.groupBy.push(id);
      }
    } else {
      const index = this.filters.groupBy.indexOf(id);
      if (index !== -1) {
        this.filters.groupBy.splice(index, 1);
      }
    }
  }

  clearEventFilter() {
    this.filters.eventId = '';
    this.selectedEventLabel = '';
  }
}
