export interface Integrante {
    id?: number;
    cedula: string;
    nombre: string;
    foto?: string;
    telefono: string;
    fechaNacimiento: string;
    direccion: string;
    categoria: 'Damas' | 'Caballeros' | 'Jóvenes' | 'Niños';
}
