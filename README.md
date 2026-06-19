# 🎓 Aulix — Tu carrera, en orden y bajo tu control

¡Hola! Bienvenido/a a **Aulix**, una aplicación de escritorio diseñada con mucho cariño por estudiantes, para estudiantes. 

Sabemos lo caótico que puede ser gestionar materias, horarios, exámenes, apuntes y correlativas en hojas de cálculo que nunca terminan de convencer. Aulix nació para resolver eso: una sola aplicación, hermosa y simple, para que te enfoques en lo que realmente importa: **estudiar**.

<div align="center">
  <br />
  <img src="public/aulix-icon.svg" alt="Aulix Logo" width="100" height="100" />
  <br />
  <h3><strong>100% Local · Offline-First · Sin Cuentas · Sin Suscripciones</strong></h3>
  <br />
</div>

---

## ✨ ¿Por qué te va a encantar Aulix?

*   **🔒 Privacidad Absoluta**: Todo lo que cargas se guarda directamente en tu computadora. Nadie más puede ver tus notas, tus materias o tus notas académicas.
*   **🔌 Funciona sin Internet**: ¿Estás en la facultad con mala señal? No pasa nada. Aulix funciona de manera completamente offline.
*   **⚡ Todo en un solo lugar**:
    *   **Grafo de Carreras**: Mira qué materias puedes cursar según tus correlativas aprobadas o regulares.
    *   **Horarios automáticos**: Carga tus materias y el calendario semanal se generará solo.
    *   **Tablero de Tareas**: Un tablero Kanban simple para mover tus entregas y exámenes.
    *   **Pomodoro**: Un temporizador integrado para estudiar con intervalos y ver tus estadísticas.
    *   **Notas y Enlaces**: Apuntes rápidos por materia y accesos directos a tus carpetas de Drive o aulas virtuales.

---

## 🚀 ¿Cómo empezar a usarla?

### 📥 1. Clonar e Instalar
Si quieres probar Aulix en tu computadora y ver cómo funciona el código, solo necesitas abrir tu terminal y ejecutar:

```bash
# Clona el proyecto
git clone https://github.com/juanr8234/aulix.git

# Entra a la carpeta
cd aulix

# Instala todo lo necesario
npm install
```

### 💻 2. Ejecutar en modo desarrollo
Para ver la aplicación en funcionamiento con recarga automática mientras haces cambios:
```bash
npm run dev
```

### 📦 3. Crear tu propio instalador (para Windows)
Si quieres generar el archivo instalador `.exe` para pasárselo a tus amigos o instalarlo en tu PC sin depender del código:
```bash
npm run dist
```
*(Encontrarás el instalador listo en la carpeta `dist-electron/`)*

---

## 🤝 ¿Quieres ayudar a que crezca? (¡Cualquier aporte suma!)

Aulix es un proyecto open source y comunitario. La forma más hermosa en la que puedes colaborar es **compartiendo tu plan de carrera**:
*   Hoy la app viene con el plan de **Ingeniería en Sistemas de Información (UTN)**. 
*   Si estudias otra carrera (como Abogacía, Medicina o Diseño), puedes armar tu propio archivo de materias en formato `.json` e importarlo en la app.
*   ¡Y si nos envías ese archivo por un Pull Request, lo sumaremos para que otros estudiantes de tu misma carrera puedan usarlo directo en el onboarding!
*   Revisa cómo armarlo en la [Guía del Formato de Planes](docs/onboarding-plans.md).

---

<details>
<summary><strong>⚙️ Información Técnica Avanzada y Requisitos (Haz clic para expandir)</strong></summary>

### Requisitos del Sistema
*   **Node.js**: Versión LTS recomendada (`v18.x` o `v20.x`).
*   **npm**: `v9.x` o superior.
*   **Sistema Operativo**: Windows 10/11, macOS o Linux de 64 bits.

### Ubicación de los Datos Persistidos
Aulix guarda un archivo JSON local en el directorio de datos de tu usuario:
*   **Windows**: `%APPDATA%/aulix/aulix-data.json`  
    *(Normalmente: `C:\Users\<Usuario>\AppData\Roaming\aulix\aulix-data.json`)*
*   **macOS**: `~/Library/Application Support/aulix/aulix-data.json`
*   **Linux**: `~/.config/aulix/aulix-data.json`

### Solución de Problemas Frecuentes
1.  **Error con `sharp` o dependencias nativas:**  
    Algunos módulos de generación de iconos requieren compilaciones nativas. Si falla la instalación:
    *   En Windows (PowerShell): `Remove-Item -Path node_modules, package-lock.json -Recurse -Force` y luego `npm install`.
2.  **Puerto `5173` ocupado:**  
    Asegúrate de cerrar otros servidores de Vite locales antes de correr `npm run dev`.

</details>

---

Hecho con mucho ☕ y cariño por estudiantes de sistemas. ¡Esperamos que te sea muy útil en tu carrera!
