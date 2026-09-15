export type HeroAction = {
  id: "primary" | "secondary";
  label: string;
  href: string;
  visible: boolean;
};

export type HomepageContent = {
  eyebrow: string;
  heading: string;
  body: string;
  heroImageStoragePath: string;
  heroImageAlt: string;
  actions: HeroAction[];
  trustItems: string[];
  trustStripVisible: boolean;
  infoEyebrow: string;
  infoHeading: string;
  infoBody: string;
  infoSectionVisible: boolean;
  updatedAt: string;
};

export type HomepageSection = {
  id: string;
  title: string;
  body: string;
  visible: boolean;
  sortOrder: number;
};

export type Homepage = {
  content: HomepageContent;
  sections: HomepageSection[];
};

export const defaultHomepageContent: HomepageContent = {
  eyebrow: "Vinilos usados y nuevos · Argentina",
  heading: "Discos con historia, fotos reales y estado informado.",
  body: "Catalogo inicial de LPs de 12 pulgadas. Cada pieza se publica con stock unitario, estado del disco, estado de tapa y pedido directo por WhatsApp.",
  heroImageStoragePath: "",
  heroImageAlt: "",
  actions: [
    { id: "primary", label: "Ver catalogo", href: "#catalogo", visible: true },
    { id: "secondary", label: "Como clasificamos", href: "#clasificacion", visible: true }
  ],
  trustItems: ["Stock real por unidad", "Pedido por WhatsApp", "Usados clasificados", "Listo para escalar a backend"],
  trustStripVisible: true,
  infoEyebrow: "Estado del producto",
  infoHeading: "Disco y tapa se informan por separado.",
  infoBody: "El esqueleto ya contempla una escala simple para usados: M, NM, EX, VG+, VG y G. En la proxima etapa se puede agregar una pagina dedicada con criterios de clasificacion, limpieza, prueba de escucha y garantia.",
  infoSectionVisible: true,
  updatedAt: ""
};
