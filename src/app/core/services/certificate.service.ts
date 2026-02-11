import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { BaptismResponseDto } from '../models/baptism.model';

@Injectable({
  providedIn: 'root'
})
export class CertificateService {

  constructor() { }

  async generateBaptismCertificate(baptism: BaptismResponseDto, cedula: string, expeditionPlace: string) {
    const doc = new jsPDF({
      orientation: 'portrait', // The image provided (Step 2384) looks like PORTRAIT, not landscape.
      unit: 'mm',
      format: 'letter'
    });

    // Load the image template
    const imgData = await this.loadImage('/img/certificate-template.jpg');
    
    // Page dimensions (Letter Portrait)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add Background Image (Full Page)
    doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);


    // --- Dynamic Text Overlay ---
    
    // 1. Date (Top Left based on reference image Step 2331)
    // "Barranquilla, 01 de febrero de 2026"
    // Coordinates guess: x=20, y=70 (based on previous code)
    // In portrait, y might be different. Let's estimate from standard letter size (216x279mm).
    // The "CERTIFICAMOS:" is roughly in the middle vertical.
    // The date line is above that.
    
    const dateStr = `Barranquilla, ${this.formatDateFull(new Date())}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    // Moved down significantly (105) and slightly left (20)
    doc.text(dateStr, 20, 105); 


    // 2. Body Text (Below "CERTIFICAMOS:" which is approx at Y=120 on the template)
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const memberName = baptism.memberName.toUpperCase();
    
    // Dynamic Body
    const bodyText = `Que el señor(a) ${memberName}, identificado(a) con cédula de ciudadanía No. ${cedula} expedida en ${expeditionPlace}, recibió el Bautismo en agua en conformidad con el mandato del Señor Jesucristo (Mateo 28:19), el día ${this.formatDateFull(new Date(baptism.date))}, siendo miembro activo de nuestra congregación.`;
    
    // Split text to fit width (keeping margins)
    const margin = 20; // Reduced margin slightly for "more left"
    const splitText = doc.splitTextToSize(bodyText, pageWidth - (margin * 2));
    
    // Moved down to 145 to start below "CERTIFICAMOS:"
    doc.text(splitText, margin, 145, { align: 'justify', maxWidth: pageWidth - (margin * 2) });
    
    
    // 3. Second Paragraph (Request Date)
    // "La presente certificación se expide..."
    const reqDateText = `La presente certificación se expide a solicitud del interesado, al ${this.formatDateFull(new Date())}.`;
    doc.text(reqDateText, margin, 185); // Moved down to 185

    // Save
    doc.save(`Certificado_Bautismo_${baptism.memberName.replace(/\s+/g, '_')}.pdf`);
  }

  private loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(e);
    });
  }

  private formatDateFull(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
  }
}
