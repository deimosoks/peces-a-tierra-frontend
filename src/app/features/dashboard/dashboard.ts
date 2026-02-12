import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardService } from '../../core/services/dashboard';
import { DashboardData } from '../../core/models/dashboard.model';
import { Integrante } from '../../core/models/integrante.model';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, NgApexchartsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
    private dashboardService = inject(DashboardService);
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

    ngOnInit() {
        this.loadDashboardData();
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
        const seriesCategories = Array.from(new Set(reportData.map(d => d.category))).sort();

        const series = seriesCategories.map(cat => {
            const dataPoints = sortedKeys.map(key => {
                const matches = reportData.filter(d =>
                    (d.serviceTime === key || `${d.date}_${d.serviceName}` === key) && d.category === cat
                );
                return matches.reduce((sum, item) => sum + (item.total || 0), 0);
            });
            return { name: cat, data: dataPoints };
        });

        this.chartOptions = {
            series: series,
            chart: {
                height: 350,
                type: 'bar',
                stacked: true,
                toolbar: { show: false },
                fontFamily: 'Inter, sans-serif'
            },
            plotOptions: {
                bar: {
                    borderRadius: 8,
                    columnWidth: '60%'
                }
            },
            xaxis: {
                categories: xLabels,
                labels: { show: false }
            },
            yaxis: {
                title: { text: 'Asistencia' }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'left'
            },
            fill: { opacity: 1 },
            tooltip: {
                theme: 'light',
                shared: true,
                intersect: false,
                x: {
                    show: true,
                    formatter: (val: any) => {
                        // If val is a number, use it as index. If it's the category name, return it.
                        if (typeof val === 'number') {
                            return xLabels[val - 1] || 'Servicio';
                        }
                        return val; // It's already the 'date time - service' string
                    }
                }
            },
            colors: ['#10b981', '#3b82f6', '#f472b6', '#fbbf24', '#6366f1']
        };

        this.renderChart = true;
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
}
