'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Save, Palette, Image as ImageIcon } from 'lucide-react';

interface SettingsFormValues {
  company_logo_base64: string;
  primary_color: string;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm<SettingsFormValues>({
    defaultValues: {
      company_logo_base64: '',
      primary_color: '#1a3a5a'
    }
  });

  const logoBase64 = watch('company_logo_base64');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        reset({
          company_logo_base64: data.company_logo_base64 || '',
          primary_color: data.primary_color || '#1a3a5a'
        });
      } catch (error) {
        toast.error('Error al cargar la configuración');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
       toast.error('Por favor selecciona una imagen válida');
       return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setValue('company_logo_base64', base64);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true);
    try {
      await api.post('/settings', values);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground">
          Personaliza la apariencia de tus PDFs y otros ajustes generales.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 bg-card border rounded-md p-6">
        
        {/* Color Primario */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 font-medium text-lg">
            <Palette className="w-5 h-5" />
            <h3>Color Primario</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Este color se aplicará en los encabezados, tablas y acentos de tus cotizaciones en PDF.
          </p>
          <div className="flex items-center gap-4">
            <input 
              type="color" 
              className="w-14 h-14 p-1 cursor-pointer bg-transparent border-none rounded-md"
              {...register('primary_color')} 
            />
            <span className="font-mono bg-muted px-2 py-1 rounded border">{watch('primary_color')}</span>
          </div>
        </div>

        <hr />

        {/* Logotipo */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 font-medium text-lg">
            <ImageIcon className="w-5 h-5" />
            <h3>Logotipo Corporativo</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Se recomienda una imagen PNG (o JPG) con fondo transparente. Aparecerá en la esquina superior izquierda del PDF.
          </p>
          <Input 
            type="file" 
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileChange}
          />
          {logoBase64 && (
            <div className="mt-4 border rounded-md p-4 bg-white self-start">
              <img src={logoBase64} alt="Logotipo actual" className="max-h-24" />
            </div>
          )}
        </div>

        <Button type="submit" disabled={isSaving} className="self-end gap-2 mt-4">
          <Save className="w-4 h-4" />
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
    </div>
  );
}
