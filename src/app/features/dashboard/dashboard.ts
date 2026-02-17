import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardService } from '../../core/services/dashboard';
import { ReporteService } from '../../core/services/reporte';
import { DashboardData } from '../../core/models/dashboard.model';
import { Integrante } from '../../core/models/integrante.model';
import { ThemeService } from '../../core/services/theme.service';
import { effect } from '@angular/core';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, NgApexchartsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
    private dashboardService = inject(DashboardService);
    private themeService = inject(ThemeService);
    private cdr = inject(ChangeDetectorRef);

    data: DashboardData | null = null;
    isLoading = true;

    // Chart
    public chartOptions: any;
    renderChart = false;

    // Modals
    showBirthdayModal = false;
    showMemberDetailsModal = false;
    selectedMember: Integrante | null = null;

    constructor() {
        // React to theme changes
        effect(() => {
            const isDark = this.themeService.isDarkMode();
            if (this.data && this.data.lastWeekReport) {
                this.updateChartTheme(isDark);
            }
        });
    }

    ngOnInit() {
        this.loadDashboardData();
        this.loadTodayAttendance();
    }

    loadDashboardData() {
        this.isLoading = true;
        this.dashboardService.getDashboardData().subscribe({
            next: (res) => {
                this.data = res;
                this.prepareChart(res.lastWeekReport);
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading dashboard:', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    prepareChart(reportData: any[]) {
        if (!reportData || reportData.length === 0) {
            this.renderChart = false;
            return;
        }

        const serviceMap = new Map<string, string>();
        reportData.forEach(d => {
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
        const xLabels = sortedKeys.map(key => serviceMap.get(key)!);
        
        // Helper to get display name with subcategory
        const getCatName = (d: any) => {
             const cat = d.category;
             const sub = d.subCategory;
             return sub ? `${cat} • ${sub}` : cat;
        };

        const seriesCategories = Array.from(new Set(reportData.map(d => getCatName(d)))).sort();

        const series = seriesCategories.map(cat => {
            const dataPoints = sortedKeys.map(key => {
                const matches = reportData.filter(d =>
                    (d.serviceTime === key || `${d.date}_${d.serviceName}` === key) && getCatName(d) === cat
                );
                return matches.reduce((sum, item) => sum + (item.total || 0), 0);
            });
            return { name: cat, data: dataPoints };
        });

        this.initializeChartOptions(series, xLabels);
        this.renderChart = true;
    }

    private initializeChartOptions(series: any[], categories: string[]) {
        const isDark = this.themeService.isDarkMode();
        
        this.chartOptions = {
            series: series,
            chart: {
                height: 350,
                type: 'bar',
                stacked: true,
                toolbar: { show: false },
                fontFamily: 'Inter, sans-serif',
                background: 'transparent'
            },
            theme: {
                mode: isDark ? 'dark' : 'light'
            },
            plotOptions: {
                bar: {
                    borderRadius: 8,
                    columnWidth: '60%'
                }
            },
            xaxis: {
                categories: categories,
                labels: { show: false },
                axisBorder: { show: true, color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                axisTicks: { show: true, color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
            },
            yaxis: {
                title: { 
                    text: 'Asistencia',
                    style: { color: isDark ? '#f8fafc' : '#1e293b' }
                },
                labels: {
                    style: { colors: isDark ? '#cbd5e1' : '#64748b' }
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'left',
                labels: {
                    colors: isDark ? '#cbd5e1' : '#64748b'
                }
            },
            grid: {
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
            },
            fill: { opacity: 1 },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                shared: true,
                intersect: false,
                x: {
                    show: true,
                    formatter: (val: any) => {
                        if (typeof val === 'number') {
                            return categories[val - 1] || 'Servicio';
                        }
                        return val;
                    }
                }
            },
            colors: ['#10b981', '#3b82f6', '#f472b6', '#fbbf24', '#6366f1']
        };
    }

    private updateChartTheme(isDark: boolean) {
        if (this.chartOptions) {
            this.chartOptions = {
                ...this.chartOptions,
                theme: { mode: isDark ? 'dark' : 'light' },
                xaxis: {
                    ...this.chartOptions.xaxis,
                    axisBorder: { show: true, color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    axisTicks: { show: true, color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                },
                yaxis: {
                    ...this.chartOptions.yaxis,
                    title: { 
                        ...this.chartOptions.yaxis?.title,
                        style: { color: isDark ? '#f8fafc' : '#1e293b' }
                    },
                    labels: {
                        style: { colors: isDark ? '#cbd5e1' : '#64748b' }
                    }
                },
                legend: {
                    ...this.chartOptions.legend,
                    labels: {
                        colors: isDark ? '#cbd5e1' : '#64748b'
                    }
                },
                grid: {
                    ...this.chartOptions.grid,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                },
                tooltip: {
                    ...this.chartOptions.tooltip,
                    theme: isDark ? 'dark' : 'light'
                }
            };
            this.cdr.detectChanges();
        }
    }

    openBirthdayModal() {
        this.showBirthdayModal = true;
    }

    closeBirthdayModal() {
        this.showBirthdayModal = false;
    }

    viewMember(member: Integrante) {
        this.selectedMember = member;
        this.showMemberDetailsModal = true;
    }

    closeMemberModal() {
        this.showMemberDetailsModal = false;
        this.selectedMember = null;
    }

    formatAddress(member: Integrante): string {
        const parts = [];
        if (member.neighborhood) parts.push(member.neighborhood);
        if (member.city) parts.push(member.city);
        if (member.municipality) parts.push(member.municipality);
        return parts.length > 0 ? parts.join(', ') : '---';
    }

    getBadgeClass(categoria: any): string {
        const name = typeof categoria === 'string' ? categoria : categoria?.name;
        switch (name) {
            case 'DAMAS': return 'badge-damas';
            case 'CABALLEROS': return 'badge-caballeros';
            case 'JOVENES': return 'badge-jovenes';
            case 'NIÑOS': return 'badge-ninos';
            default: return '';
        }
    }

    formatCategory(category: any): string {
        if (!category) return '';
        if (typeof category === 'string') return category;
        return category.name || '';
    }

    formatType(type: any): string {
        if (!type) return '';
        if (typeof type === 'string') return type.replace(/_/g, ' ');
        return type.name || '';
    }

    // New Section: Today's Attendance
    todayAttendance: any[] = [];
    private reporteService = inject(ReporteService);

    loadTodayAttendance() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const filters: any = {
            startDate: this.toLocalISOString(start),
            endDate: this.toLocalISOString(end),
            groupBy: ['BRANCH', 'CATEGORY', 'SUBCATEGORY'],
            onlyActive: true
        };

        this.reporteService.generateReport(filters).subscribe({
            next: (data: any[]) => {
                this.processTodayData(data);
                this.cdr.detectChanges();
            },
            error: (err: any) => console.error('Error loading today attendance:', err)
        });
    }

    private toLocalISOString(date: Date): string {
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
        return localISOTime;
    }

    private processTodayData(data: any[]) {
        const branchMap = new Map<string, any>();

        data.forEach(d => {
            const branchName = d.branchName || 'Sin Sede';
            if (!branchMap.has(branchName)) {
                branchMap.set(branchName, { name: branchName, total: 0, categories: new Map<string, any>() });
            }
            const branch = branchMap.get(branchName);
            branch.total += (d.total || 0);

            const catName = this.formatCategory(d.category) || 'Sin Categoría';
            if (!branch.categories.has(catName)) {
                branch.categories.set(catName, { name: catName, total: 0, subCategories: [] });
            }
            const category = branch.categories.get(catName);
            category.total += (d.total || 0);

            if (d.subCategory) {
                category.subCategories.push({ name: d.subCategory, total: d.total });
            }
        });

        this.todayAttendance = Array.from(branchMap.values()).map(b => ({
            ...b,
            categories: Array.from(b.categories.values())
        }));
    }
}
