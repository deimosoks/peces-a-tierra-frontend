import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportColumn {
    id: string;
    label: string;
    visible: boolean;
    order: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    exportToExcel(data: any[], columns: ReportColumn[], fileName: string, groupBy?: string) {
        const visibleColumns = this.getOrderedVisibleColumns(columns);
        const workbook = XLSX.utils.book_new();

        if (groupBy) {
            const groups = this.groupData(data, groupBy);
            const sheetData: any[] = [];

            Object.keys(groups).forEach(groupKey => {
                // Add Header for Group
                sheetData.push({ [visibleColumns[0].label]: `${groupBy.toUpperCase()}: ${groupKey}` });
                // Add Data for Group
                const formattedGroupData = this.formatDataForExport(groups[groupKey], visibleColumns);
                sheetData.push(...formattedGroupData);
                // Empty row
                sheetData.push({});
            });

            const worksheet = XLSX.utils.json_to_sheet(sheetData, { skipHeader: false });
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
        } else {
            const filteredData = this.formatDataForExport(data, visibleColumns);
            const worksheet = XLSX.utils.json_to_sheet(filteredData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
        }

        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    exportToPdf(data: any[], columns: ReportColumn[], fileName: string, title: string, groupBy?: string) {
        const visibleColumns = this.getOrderedVisibleColumns(columns);
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);

        const headers = [visibleColumns.map(col => col.label)];

        if (groupBy) {
            const groups = this.groupData(data, groupBy);
            let currentY = 35;

            Object.keys(groups).forEach((groupKey, index) => {
                // Check if we need a new page
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                if (index > 0) currentY += 10;

                doc.setFontSize(12);
                doc.setTextColor(0);
                doc.setFont('helvetica', 'bold');
                doc.text(`${groupBy.toUpperCase()}: ${groupKey}`, 14, currentY);
                currentY += 5;

                const groupData = this.formatDataForExport(groups[groupKey], visibleColumns);
                const body = groupData.map(row => visibleColumns.map(col => row[col.label]));

                autoTable(doc, {
                    startY: currentY,
                    head: headers,
                    body: body,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    didDrawPage: (dataInfo) => {
                        // currentY is updated by autoTable internally if needed, 
                        // but we need to track it for the next group
                    }
                });

                currentY = (doc as any).lastAutoTable.finalY + 5;
            });
        } else {
            const filteredData = this.formatDataForExport(data, visibleColumns);
            const body = filteredData.map(row => visibleColumns.map(col => row[col.label]));

            autoTable(doc, {
                startY: 35,
                head: headers,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                styles: { fontSize: 8, cellPadding: 2 }
            });
        }

        doc.save(`${fileName}.pdf`);
    }

    private groupData(data: any[], key: string): { [key: string]: any[] } {
        return data.reduce((groups, item) => {
            const val = this.resolveValue(item, key) || 'Sin Valor';
            if (!groups[val]) groups[val] = [];
            groups[val].push(item);
            return groups;
        }, {} as { [key: string]: any[] });
    }

    private getOrderedVisibleColumns(columns: ReportColumn[]): ReportColumn[] {
        return [...columns]
            .filter(col => col.visible)
            .sort((a, b) => a.order - b.order);
    }

    private formatDataForExport(data: any[], columns: ReportColumn[]): any[] {
        const aggregatedMap = new Map<string, any>();

        data.forEach(item => {
            const formattedItem: any = {};
            const groupingKeyParts: string[] = [];

            columns.forEach(col => {
                const value = this.resolveValue(item, col.id);
                formattedItem[col.label] = value;
                // build key for aggregation - exclude 'total' from key
                if (col.id !== 'total') {
                    groupingKeyParts.push(String(value));
                }
            });

            const key = groupingKeyParts.join('|');

            if (aggregatedMap.has(key)) {
                const existing = aggregatedMap.get(key);
                columns.forEach(col => {
                    if (col.id === 'total') {
                        const val = this.resolveValue(item, col.id);
                        existing[col.label] = (Number(existing[col.label]) || 0) + (Number(val) || 0);
                    }
                });
            } else {
                aggregatedMap.set(key, { ...formattedItem });
            }
        });

        return Array.from(aggregatedMap.values());
    }

    private resolveValue(item: any, path: string): any {
        let val: any;

        // Basic formatting for dates or nested objects if needed
        if (path === 'attendanceDate' || path === 'serviceDate') {
            val = new Date(item[path] || item.id?.[path]).toLocaleString();
        } else if (path === 'date' && item.serviceTime) {
            val = new Date(item.serviceTime).toLocaleString();
        } else if (path.includes('.')) {
            val = path.split('.').reduce((obj, key) => obj?.[key], item);
        } else {
            val = item[path];
        }

        // If the value is an object with a name property (like Category or Type), return the name
        if (val && typeof val === 'object' && 'name' in val) {
            return val.name;
        }

        return val;
    }
}
