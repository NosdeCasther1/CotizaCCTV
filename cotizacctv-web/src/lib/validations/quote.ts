import * as z from "zod";

export const quoteSchema = z.object({
  client_name: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  freight_cost: z.coerce.number().min(0, "El flete no puede ser negativo."),
  installation_total: z.coerce.number().min(0, "La mano de obra no puede ser negativa."),
  distance_km: z.coerce.number().min(0, "La distancia no puede ser negativa."),
  installation_days: z.coerce.number().min(1, "El proyecto debe durar al menos 1 día."),
  items: z.array(
    z.object({
      product_id: z.coerce.number().positive("Seleccione un producto válido."),
      quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
      unit_price: z.coerce.number().optional(),
    })
  ).min(1, "Debe agregar al menos un equipo a la cotización."),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;
