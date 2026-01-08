import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegranteService } from '../../core/services/integrante';
import { AsistenciaService } from '../../core/services/asistencia';
import { ReporteService } from '../../core/services/reporte';
import { ReportFilters, ReportData } from '../../core/models/reporte.model';
import { IglesiaService } from '../../core/models/asistencia.model';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid,
  ApexTooltip,
  ApexPlotOptions,
  ChartComponent
} from "ng-apexcharts";
import { ViewChild } from '@angular/core';

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
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  private integranteService = inject(IntegranteService);
  private asistenciaService = inject(AsistenciaService);
  private reporteService = inject(ReporteService);
  private cdr = inject(ChangeDetectorRef);

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

  // Enums
  tipos = ['INICIANTE', 'VISITANTE', 'MIEMBRO', 'SIMPATIZANTE'];
  categorias = ['DAMAS', 'CABALLEROS', 'JOVENES', 'NIÑOS'];

  // Chart
  public chartOptions: any;

  ngOnInit() {
    this.chartOptions = this.getPremiumChartOptions([], []);
    this.loadServices();
  }

  loadServices() {
    this.asistenciaService.getServices(false).subscribe(data => {
      this.services = data;
    });
  }

  private getPremiumChartOptions(series: any[], categories: string[]): any {
    const safeSeries = (series && series.length > 0) ? series : [{ name: 'Sin Datos', data: [] }];
    const safeCategories = (categories && categories.length > 0) ? categories : ['-'];

    return {
      series: safeSeries,
      chart: {
        height: 300,
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
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 6,
          dataLabels: {
            total: {
              enabled: false // Disabled to avoid overlap on dense charts
            }
          }
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        type: 'category',
        categories: safeCategories,
        labels: {
          show: false
        },
        axisBorder: { show: false },
        tooltip: { enabled: false }
      },
      yaxis: {
        title: { text: 'Asistencia' },
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
        markers: { radius: 12 }
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } }
      },
      tooltip: {
        theme: 'light',
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
    this.integranteService.searchMembers(this.memberSearchQuery, 0, true).subscribe({
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
    this.memberResults = [];
    this.memberSearchQuery = '';
  }

  clearMemberSelection() {
    this.filters.userId = '';
    this.selectedMemberName = '';
    this.memberResults = [];
    this.memberSearchQuery = '';
  }

  applyFilters() {
    this.isLoading = true;

    // Prepare filters for backend DTO (lists and ISO format)
    const reportFilters: ReportFilters = {
      onlyActive: this.filters.onlyActive,
      userId: this.filters.userId || undefined,
      typePeoples: this.filters.typeOfPeople ? [this.filters.typeOfPeople] : undefined,
      categories: this.filters.category ? [this.filters.category] : undefined,
      serviceIds: this.filters.serviceId ? [this.filters.serviceId] : undefined,
    };

    // Date/Time logic: ensure format is YYYY-MM-DDTHH:mm:ss
    const formatDateTime = (val: string) => {
      if (!val) return undefined;
      if (!val.includes('T')) return `${val}T00:00:00`;
      // If it's YYYY-MM-DDTHH:mm, add :00
      if (val.split(':').length === 2) return `${val}:00`;
      return val;
    };

    reportFilters.startDate = formatDateTime(this.filters.startDate);
    reportFilters.endDate = formatDateTime(this.filters.endDate);

    this.reporteService.generateReport(reportFilters).subscribe({
      next: (data) => {
        this.reportData = data;
        this.updateChart();
        this.isLoading = false;
        this.closeFilterModal();
      },
      error: (err) => {
        console.error('Error fetching report:', err);
        this.isLoading = false;
        alert('Error al generar el reporte');
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

    // 1. Calculate Metrics (First time or when data changes)
    this.calculateStats();

    // 2. Process all data for the chart
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
    const seriesCategories = Array.from(new Set(this.reportData.map(d => d.category))).sort();

    this.allSeries = seriesCategories.map(cat => {
      const dataPoints = sortedKeys.map(key => {
        const matches = this.reportData.filter(d =>
          (d.serviceTime === key || `${d.date}_${d.serviceName}` === key) && d.category === cat
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

    // Slice both labels and data within each series
    const pagedLabels = this.allXLabels.slice(start, end);
    const pagedSeries = this.allSeries.map(s => ({
      name: s.name,
      data: s.data.slice(start, end)
    }));

    setTimeout(() => {
      this.chartOptions = this.getPremiumChartOptions(pagedSeries, pagedLabels);
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
      catTotals.set(d.category, (catTotals.get(d.category) || 0) + (d.total || 0));
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

  downloadReport() {
    alert('Generando reporte con los filtros actuales...');
  }
}
