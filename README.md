# Dhermica-Next 🌸

Sistema de gestión de turnos para Dhermica Estética, construido con Next.js 15, Firebase y TypeScript.

## 🚀 Características

### ✅ Implementado

- **Gestión de Turnos**
  - Tabla unificada con columnas dinámicas por profesional
  - Columna "General" para turnos legacy sin profesional asignado
  - Crear, editar y eliminar turnos con confirmación
  - Validación de superposición de horarios
  - Alertas si un cliente ya tiene turno en la fecha
  - Notas opcionales en cada turno
  
- **Interfaz Mobile-First**
  - Diseño responsive optimizado para móvil
  - Modales fullscreen en móvil, centrados en desktop
  - Botones touch-friendly (mínimo 44x44px)
  - Scroll horizontal suave en la tabla

- **Sistema de Profesionales**
  - Profesionales configurables con colores distintivos
  - Columnas dinámicas según profesionales activos
  - Luciana y Gisela pre-configurados

### 🔜 Próximamente

- Panel de gestión de profesionales
- Búsqueda por nombre de cliente
- Filtros por profesional y fecha
- Vista de calendario mensual

## 📦 Tecnologías

- **Next.js 16** - Framework React con App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Estilos
- **Firebase 12** - Base de datos y autenticación
- **Lucide React** - Iconos modernos
- **Sonner** - Toast notifications
- **Zustand** - Estado global
- **date-fns** - Manejo de fechas

## 🛠️ Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar Firebase:**
   
   El archivo `.env.local` ya está configurado con las credenciales de Firebase existentes.

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador:**
   ```
   http://localhost:3000
   ```

## 📁 Estructura del Proyecto

```
dhermica-next/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Homepage
│   │   └── turnos/
│   │       └── page.tsx          # Página de gestión de turnos
│   ├── components/
│   │   ├── appointments/         # Componentes de turnos
│   │   │   ├── AppointmentTable.tsx
│   │   │   ├── AppointmentModal.tsx
│   │   │   ├── DeleteConfirmDialog.tsx
│   │   │   └── DatePicker.tsx
│   │   └── ui/                   # Componentes UI reutilizables
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       └── Modal.tsx
│   ├── lib/
│   │   ├── firebase/             # Configuración y funciones de Firebase
│   │   │   ├── config.ts
│   │   │   ├── appointments.ts
│   │   │   └── professionals.ts
│   │   ├── types/                # Definiciones de TypeScript
│   │   │   ├── appointment.ts
│   │   │   └── professional.ts
│   │   ├── utils/                # Utilidades
│   │   │   ├── time.ts
│   │   │   └── validation.ts
│   │   └── hooks/                # Custom hooks
│   │       ├── useAppointments.ts
│   │       └── useProfessionals.ts
│   └── store/
│       └── professionals.ts      # Estado global de profesionales
└── .env.local                    # Variables de entorno
```

## 🔥 Firebase

### Colecciones

#### `appointments`
```typescript
{
  id: string;
  clientName: string;
  treatment: string;
  date: string;              // YYYY-MM-DD
  time: string;              // HH:mm
  duration: number;          // En horas (0.5, 1, 1.5, etc.)
  professionalId?: string;   // Opcional para turnos legacy
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `professionals`
```typescript
{
  id: string;
  name: string;
  color: string;    // Color hex para identificación visual
  active: boolean;
  order: number;    // Para ordenar columnas
  createdAt: Date;
}
```

### Migración de Datos Legacy

Los turnos antiguos de las colecciones `turnosLuciana` y `turnosGisela` se pueden migrar a la nueva estructura. Los turnos sin `professionalId` aparecerán automáticamente en la columna "General".

## 📱 Uso

### Crear un Turno

1. Selecciona una fecha
2. Click en el ícono `+` en la celda disponible
3. Completa el formulario (hora y profesional se pre-cargan)
4. Click en "Crear Turno"

### Editar un Turno

1. Click en el ícono de lápiz en el turno
2. Modifica los datos necesarios
3. Click en "Actualizar"

### Eliminar un Turno

1. Click en el ícono de papelera
2. Confirma la eliminación
3. El turno se elimina y recibes una notificación

## 🎨 Diseño

- **Colores principales:**
  - Violet: `#8B5CF6` (Luciana)
  - Pink: `#EC4899` (Gisela)
  
- **Gradientes:**
  - Background: `from-violet-50 via-pink-50 to-blue-50`
  - Header tabla: `from-violet-600 to-pink-600`

## 🚧 Desarrollo

### Comandos disponibles

```bash
npm run dev      # Desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción
```

### Próximos pasos

1. Implementar panel de gestión de profesionales
2. Agregar búsqueda y filtros
3. Crear vista de calendario
4. Agregar autenticación de usuarios
5. Implementar roles (admin, profesional, recepcionista)

## 📄 Licencia

Proyecto privado de Dhermica Estética.

---

**Desarrollado con ❤️ para Dhermica Estética**
