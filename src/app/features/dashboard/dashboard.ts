import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardService } from '../../core/services/dashboard';
import { ReporteService } from '../../core/services/reporte';
import { AsistenciaService } from '../../core/services/asistencia';
import { DashboardData } from '../../core/models/dashboard.model';
import { Integrante } from '../../core/models/integrante.model';
import { PagesResponseDto } from '../../core/models/pagination.model';
import { AttendanceResponseDto } from '../../core/models/asistencia.model';
import { ThemeService } from '../../core/services/theme.service';
import { effect } from '@angular/core';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MemberConfigService } from '../../core/services/member-config.service';
import { MemberCategoryResponseDto } from '../../core/models/member-config.model';

// Chart palette used across all charts
const CHART_PALETTE = [
    '#3b82f6', '#10b981', '#f472b6', '#fbbf24',
    '#6366f1', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'
];

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, NgApexchartsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
    private dashboardService = inject(DashboardService);
    private themeService = inject(ThemeService);
    private cdr = inject(ChangeDetectorRef);
    private asistenciaService = inject(AsistenciaService);
    private memberConfigService = inject(MemberConfigService);
    private reporteService = inject(ReporteService);
    private destroy$ = new Subject<void>();

    private availableCategories: MemberCategoryResponseDto[] = [];

    data: DashboardData | null = null;
    isLoading = true;

    // Attendance Details Modal
    showAttendanceDetailsModal = false;
    isLoadingDetails = false;
    attendanceDetails: { serviceName: string, serviceDate: string, attendees: AttendanceResponseDto[] }[] = [];
    selectedBranchForDetails: string = '';
    selectedCategoryForDetails: string = '';

    // Single stacked chart (kept for backwards compat, unused in new UI)
    public chartOptions: any;
    renderChart = false;

    // NEW: Per-category weekly trend charts
    categoryWeeklyCharts: { category: string, color: string, chartOptions: any }[] = [];

    // NEW: Today's donut charts per category (includes sub list for template display)
    todayCategoryCharts: {
        branch: { id: any, name: string },
        name: string,
        categoryId: any,
        color: string,
        total: number,
        donutOptions: any,
        subs: { name: string, id: any, total: number, color: string }[]
    }[] = [];

    // Track last today data hash for change detection
    private lastTodayHash = '';

    // NEW: Summary totals
    weeklyTotal = 0;
    weeklyPeak = 0;
    weeklyAverage = 0;
    weeklyServices: { key: string, date: string, name: string, total: number }[] = [];
    weeklyServicesChartOptions: any;

    // Modals
    showBirthdayModal = false;
    showMemberDetailsModal = false;
    selectedMember: Integrante | null = null;

    // Today attendance data
    todayAttendance: any[] = [];

    constructor() {
        effect(() => {
            const isDark = this.themeService.isDarkMode();
            if (this.data?.lastWeekReport) {
                this.rebuildCharts(this.data.lastWeekReport, isDark);
                this.cdr.detectChanges();
            }
        });
    }

    ngOnInit() {
        this.loadCategories();
        this.loadDashboardData();
        this.loadTodayAttendance();
        this.startPolling();
    }

    loadCategories() {
        this.memberConfigService.getCategories().subscribe({
            next: (cats) => {
                this.availableCategories = cats;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading categories mapping:', err)
        });
    }

    startPolling() {
        interval(30000) // Poll every 60 seconds to avoid annoying rerenders
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.loadTodayAttendance();
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadDashboardData() {
        this.isLoading = true;
        this.dashboardService.getDashboardData().subscribe({
            next: (res) => {
                this.data = res;
                if (this.data?.membersBirthdays) {
                    this.data.membersBirthdays.sort((a, b) => {
                        if (!a.birthdate) return 1;
                        if (!b.birthdate) return -1;
                        const dateA = new Date(a.birthdate);
                        const dateB = new Date(b.birthdate);
                        const monthA = dateA.getMonth();
                        const monthB = dateB.getMonth();
                        if (monthA !== monthB) return monthA - monthB;
                        return dateA.getDate() - dateB.getDate();
                    });
                }
                this.rebuildCharts(res.lastWeekReport, this.themeService.isDarkMode());
                this.computeSummaryTotals(res.lastWeekReport);
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

    // ─── Chart Rebuilding ────────────────────────────────────────────────────

    private rebuildCharts(reportData: any[], isDark: boolean) {
        if (!reportData || reportData.length === 0) {
            this.renderChart = false;
            this.categoryWeeklyCharts = [];
            return;
        }

        // Build X-axis labels (services)
        const serviceMap = new Map<string, string>();
        reportData.forEach(d => {
            const key = d.serviceTime || `${d.date}_${d.serviceName}`;
            if (!serviceMap.has(key)) {
                let displayInfo = d.date;
                if (d.serviceTime?.includes('T')) {
                    const time = d.serviceTime.split('T')[1].substring(0, 5);
                    displayInfo = `${d.date} ${time}`;
                }
                serviceMap.set(key, `${displayInfo} - ${d.serviceName}`);
            }
        });
        const sortedKeys = Array.from(serviceMap.keys()).sort();
        const xLabels = sortedKeys.map(k => serviceMap.get(k)!);

        // Group by main category
        const categoryGroups = new Map<string, any[]>();
        reportData.forEach(d => {
            const cat = d.category || 'Sin Categoría';
            if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
            categoryGroups.get(cat)!.push(d);
        });

        // Build one chart per category
        let colorIndex = 0;
        this.categoryWeeklyCharts = [];
        categoryGroups.forEach((rows, categoryName) => {
            const color = CHART_PALETTE[colorIndex % CHART_PALETTE.length];
            colorIndex++;

            // Sub-series within this category
            const subCats = Array.from(new Set(rows.map(d => d.subCategory || 'General'))).sort();
            const series = subCats.map((sub, i) => {
                const subColor = CHART_PALETTE[(colorIndex + i) % CHART_PALETTE.length];
                const dataPoints = sortedKeys.map(key => {
                    return rows
                        .filter(d => (d.serviceTime === key || `${d.date}_${d.serviceName}` === key)
                            && (d.subCategory || 'General') === sub)
                        .reduce((sum, item) => sum + (item.total || 0), 0);
                });
                return { name: sub, data: dataPoints, color: subColor };
            });

            const chartOptions = this.buildBarChartOptions(series, xLabels, isDark, color);
            this.categoryWeeklyCharts.push({ category: categoryName, color, chartOptions });
        });

        this.renderChart = this.categoryWeeklyCharts.length > 0;
    }

    private buildBarChartOptions(series: any[], categories: string[], isDark: boolean, accentColor: string): any {
        return {
            series,
            chart: {
                height: 220,
                type: 'bar',
                stacked: true,
                toolbar: { show: false },
                fontFamily: 'Inter, sans-serif',
                background: 'transparent',
                sparkline: { enabled: false }
            },
            theme: { mode: isDark ? 'dark' : 'light' },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    columnWidth: '60%',
                    dataLabels: {
                        total: {
                            enabled: true,
                            style: {
                                fontWeight: 700,
                                fontSize: '10px',
                                color: isDark ? '#cbd5e1' : '#475569'
                            }
                        }
                    }
                }
            },
            xaxis: {
                categories,
                labels: { show: false },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: {
                    style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' }
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'left',
                fontSize: '11px',
                labels: { colors: isDark ? '#cbd5e1' : '#64748b' }
            },
            grid: {
                borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
                padding: { left: 0, right: 0, bottom: 0 }
            },
            fill: { opacity: 1 },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                shared: true,
                intersect: false,
                x: {
                    formatter: (val: any, opts: any) => {
                        const idx = (typeof val === 'number') ? val - 1 : opts?.dataPointIndex;
                        return categories[idx] || 'Servicio';
                    }
                }
            }
        };
    }

    /** Builds donut chart options for today's per-category data */
    private buildDonutOptions(labels: string[], values: number[], colors: string[], isDark: boolean): any {
        return {
            series: values,
            chart: {
                type: 'donut',
                height: 160,
                background: 'transparent',
                toolbar: { show: false }
            },
            theme: { mode: isDark ? 'dark' : 'light' },
            labels,
            colors,
            legend: { show: false },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            plotOptions: {
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: isDark ? '#94a3b8' : '#64748b',
                                formatter: (w: any) =>
                                    w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
                            }
                        }
                    }
                }
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light'
            }
        };
    }

    /** Build today's donut charts from todayAttendance */
    private buildTodayDonuts() {
        // Build a hash to avoid unnecessary re-renders during polling
        const newHash = JSON.stringify(this.todayAttendance);
        if (newHash === this.lastTodayHash) return;
        this.lastTodayHash = newHash;

        const isDark = this.themeService.isDarkMode();
        this.todayCategoryCharts = [];
        let colorIdx = 0;

        // Iterate through each branch to create distinct charts per branch
        this.todayAttendance.forEach((branchData: any) => {
            const branchObj = { id: branchData.id, name: branchData.name || 'Sin Sede' };

            branchData.categories.forEach((catData: any) => {
                const mainColor = CHART_PALETTE[colorIdx % CHART_PALETTE.length];
                colorIdx++;

                let labels: string[];
                let values: number[];
                let colors: string[];
                let subsWithColors: { name: string, id: any, total: number, color: string }[];

                if (catData.subCategories && catData.subCategories.length > 0) {
                    subsWithColors = catData.subCategories.map((s: any, i: number) => ({
                        name: s.name,
                        id: s.id,
                        total: s.total,
                        color: CHART_PALETTE[(colorIdx + i) % CHART_PALETTE.length]
                    }));
                    labels = subsWithColors.map(s => s.name);
                    values = subsWithColors.map(s => s.total);
                    colors = subsWithColors.map(s => s.color);
                } else {
                    subsWithColors = [];
                    labels = [catData.name];
                    values = [catData.total];
                    colors = [mainColor];
                }

                this.todayCategoryCharts.push({
                    branch: branchObj,
                    name: catData.name,
                    categoryId: catData.id,
                    color: mainColor,
                    total: catData.total,
                    subs: subsWithColors,
                    donutOptions: this.buildDonutOptions(labels, values, colors, isDark)
                });
            });
        });


    }

    /** Compute weekly summary totals from lastWeekReport */
    private computeSummaryTotals(reportData: any[]) {
        if (!reportData || reportData.length === 0) {
            this.weeklyTotal = 0;
            this.weeklyPeak = 0;
            this.weeklyAverage = 0;
            this.weeklyServices = [];
            return;
        }

        // Group by service to get per-service totals
        const serviceGroupMap = new Map<string, { date: string, name: string, total: number }>();
        reportData.forEach(d => {
            const key = d.serviceTime || `${d.date}_${d.serviceName}`;
            if (!serviceGroupMap.has(key)) {
                serviceGroupMap.set(key, {
                    date: d.date || d.serviceDate || d.serviceTime,
                    name: d.serviceName || 'Servicio General',
                    total: 0
                });
            }
            serviceGroupMap.get(key)!.total += (d.total || 0);
        });

        const services = Array.from(serviceGroupMap.entries()).map(([key, data]) => ({
            key,
            date: data.date,
            name: data.name,
            total: data.total
        }));
        // Sort chronologically (assuming keys or dates sort nicely; if not, at least they are grouped)
        services.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        this.weeklyServices = services;
        const totals = services.map(s => s.total);

        this.weeklyTotal = totals.reduce((a, b) => a + b, 0);
        this.weeklyPeak = totals.length > 0 ? Math.max(...totals) : 0;
        this.weeklyAverage = totals.length > 0
            ? Math.round(this.weeklyTotal / totals.length)
            : 0;

        this.buildWeeklyServicesChart();
    }

    private buildWeeklyServicesChart() {
        if (this.weeklyServices.length === 0) {
            this.weeklyServicesChartOptions = null;
            return;
        }

        const isDark = this.themeService.isDarkMode();
        const categories = this.weeklyServices.map(s => {
            const dateStr = new Date(s.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            return `${s.name} (${dateStr})`;
        });
        const data = this.weeklyServices.map(s => s.total);

        this.weeklyServicesChartOptions = {
            series: [{
                name: 'Asistentes',
                data: data
            }],
            chart: {
                type: 'bar',
                height: 320,
                toolbar: { show: false },
                fontFamily: 'Inter, sans-serif'
            },
            plotOptions: {
                bar: {
                    borderRadius: 6,
                    columnWidth: '45%',
                    distributed: true,
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val: number) => val,
                style: {
                    colors: [isDark ? '#fff' : '#fff']
                }
            },
            stroke: { show: false },
            xaxis: {
                categories: categories,
                labels: {
                    style: {
                        colors: isDark ? '#9ca3af' : '#6b7280',
                        fontSize: '11px'
                    }
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: {
                    style: { colors: isDark ? '#9ca3af' : '#6b7280' }
                }
            },
            grid: {
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                strokeDashArray: 4,
            },
            colors: CHART_PALETTE,
            legend: { show: false },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                y: { formatter: (val: number) => `${val} personas` }
            }
        };
    }

    // ─── Today's Attendance ──────────────────────────────────────────────────

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
                this.buildTodayDonuts();
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
                branchMap.set(branchName, { name: branchName, id: d.branchId, total: 0, categories: new Map<string, any>() });
            }
            const branch = branchMap.get(branchName);
            branch.total += (d.total || 0);

            const catResponse = d.category;
            const catName = this.formatCategory(catResponse) || 'Sin Categoría';
            const canonicalCat = this.availableCategories.find(c => c.name.toUpperCase() === catName.toUpperCase());

            if (!branch.categories.has(catName)) {
                branch.categories.set(catName, { name: catName, id: canonicalCat?.id, total: 0, subCategories: [] });
            }
            const category = branch.categories.get(catName);
            category.total += (d.total || 0);

            if (d.subCategory) {
                const subName = d.subCategory;
                const canonicalSub = canonicalCat?.subCategories?.find(s => s.name.toUpperCase() === subName.toUpperCase());
                category.subCategories.push({ name: subName, id: canonicalSub?.id, total: d.total });
            }
        });

        this.todayAttendance = Array.from(branchMap.values()).map(b => ({
            ...b,
            categories: Array.from(b.categories.values())
        }));
    }

    // ─── Totals for display ──────────────────────────────────────────────────

    get totalTodayAttendance(): number {
        return this.todayAttendance.reduce((sum, b) => sum + b.total, 0);
    }

    // ─── Utility ────────────────────────────────────────────────────────────

    calculateAge(birthdate: string | Date | undefined): number {
        if (!birthdate) return 0;
        const birth = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
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

    // ─── Modals ──────────────────────────────────────────────────────────────

    openBirthdayModal() { this.showBirthdayModal = true; }
    closeBirthdayModal() { this.showBirthdayModal = false; }

    viewMember(member: Integrante) {
        this.selectedMember = member;
        this.showMemberDetailsModal = true;
    }
    closeMemberModal() {
        this.showMemberDetailsModal = false;
        this.selectedMember = null;
    }

    /** Called from donut card header (category level) or sub row (subcategory level). */
    openCategoryDetail(branch: { name: string, id: any }, cat: { name: string, categoryId: any }, sub?: { name: string, id: any } | null) {
        const categoryArg = { name: cat.name, id: cat.categoryId };
        const subArg = sub ? { name: sub.name, id: sub.id } : null;
        this.openAttendanceDetails(branch, categoryArg, subArg);
    }

    openAttendanceDetails(branch: any, category: any, subCategory: any = null) {
        this.selectedBranchForDetails = branch.name;
        this.selectedCategoryForDetails = subCategory ? `${category.name} - ${subCategory.name}` : category.name;
        this.showAttendanceDetailsModal = true;
        this.isLoadingDetails = true;
        this.attendanceDetails = [];

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const filters: any = {
            startDate: this.toLocalISOString(start),
            endDate: this.toLocalISOString(end),
            category: category.id ? [category.id] : (typeof category === 'string' ? [category] : []),
            subCategory: subCategory?.id ? [subCategory.id] : (subCategory ? [subCategory.name || subCategory] : []),
            invalid: false
        };

        if (branch.id) {
            filters.branchId = branch.id;
        } else if (branch.name && branch.name !== 'Todas las Sedes') {
            filters.branchName = branch.name;
        }

        this.asistenciaService.getAttendances(filters, 0).subscribe({
            next: (res: PagesResponseDto<AttendanceResponseDto>) => {
                const groups = new Map<string, AttendanceResponseDto[]>();
                res.data.forEach((a: AttendanceResponseDto) => {
                    const key = `${a.serviceDate}_${a.serviceName}`;
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(a);
                });
                this.attendanceDetails = Array.from(groups.entries()).map(([, list]) => ({
                    serviceName: list[0].serviceName,
                    serviceDate: list[0].serviceDate,
                    attendees: list
                }));
                this.attendanceDetails.sort((a, b) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime());
                this.isLoadingDetails = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error details:', err);
                this.isLoadingDetails = false;
                this.cdr.detectChanges();
            }
        });
    }

    closeAttendanceDetailsModal() {
        this.showAttendanceDetailsModal = false;
        this.attendanceDetails = [];
    }
}
