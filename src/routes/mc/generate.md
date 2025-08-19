## client form validation
-- return false if not exist java installed is necessary install 
-- make 2 routers for new server with url core, and new server with file core (paper.1.20.jar) 
sample validations and key in client
```typescript
import generateNewServerStart from "@components/newserver/startscript";
import { type TabButtonData } from "src/types/elements";
import { serverapi } from "src/utils/fetch/fetchapi";
import { tabsSignal, signals } from "src/globalSignals";
import { CInput } from "src/litcomponents/CInput";
import type { DialogContainer } from "src/litcomponents/custom-modal";
import type { NotificationControls } from 'src/types/Notification';
import { getNotifierApi, showDialogWithMessage } from 'src/utils/NotificationEmitterManager';

// Tipos para mejorar la tipificación
interface ServerFormData {
  serverName?: string;
  selecttab?: string;
  coreName?: string;
  coreVersion?: string;
  fileName?: string;
  javaVersion?: string;
  Ramsize?: string;
  serverPort?: string;
  optiflags?: string;
  startParameters?: string;
}

interface FormElement extends Element {
  value?: any;
  Values?: any;
}

// Constantes del formulario
const FORM_ELEMENT_IDS = [
  "serverName",
  "selecttab",
  "coreName",
  "coreVersion",
  "fileName",
  "javaVersion",
  "Ramsize",
  "serverPort",
  "optiflags"
] as const;

type FormElementId = typeof FORM_ELEMENT_IDS[number];

const notifications = document.querySelector("task-notifications");
const formElements: FormElement[] = [];
const formData: ServerFormData = {};

/**
 * Establece un valor en el objeto de datos del formulario
 * @param id - Identificador del campo del formulario
 * @param value - Valor a establecer
 */
function setFormValue(id: FormElementId, value: any): void {
  formData[id] = value;
}

/**
 * Configura los event listeners para los elementos del formulario
 * @param element - Elemento del DOM al que añadir el listener
 * @param id - Identificador del elemento
 */
function setupElementListener(element: FormElement, id: FormElementId): void {
  element.addEventListener('change', (event: Event) => {
    const customEvent = event as CustomEvent;
    const eventData = customEvent.detail;
    
    console.log(`Campo ${id} cambió:`, eventData);
    
    if (!eventData?.value) {
      console.warn(`Valor vacío o inválido para el campo: ${id}`);
      return;
    }
    
    setFormValue(id, eventData.value);
  });
}

/**
 * Obtiene el archivo seleccionado de un input de tipo file
 * @param elementId - ID del elemento input file
 * @returns El archivo seleccionado o null si no hay ninguno
 */
function getSelectedFile(elementId: string): File | null {
  const inputElement = document.getElementById(elementId) as HTMLElement & CInput;
  
  if (!inputElement) {
    console.error(`Elemento con ID '${elementId}' no encontrado`);
    return null;
  }
  
  const fileInput = inputElement.shadowRoot?.querySelector('input') as HTMLInputElement;
  return fileInput?.files?.[0] || null;
}


/**
 * Inicializa los elementos del formulario y configura sus event listeners
 */
function initializeFormElements(): void {
  FORM_ELEMENT_IDS.forEach((id) => {
    const element = document.getElementById(id) as FormElement;
    
    if (!element) {
      console.warn(`Elemento con ID '${id}' no encontrado`);
      return;
    }
    
    formElements.push(element);
    
    // Establece el valor inicial si el elemento lo tiene
    if ('value' in element && element.value !== undefined) {
      setFormValue(id, element.value);
    }
    
    setupElementListener(element, id);
  });
}

// Inicializar elementos del formulario
initializeFormElements();

/**
 * Actualiza todos los valores del formulario desde los elementos del DOM
 */
function updateFormDataFromElements(): void {
  FORM_ELEMENT_IDS.forEach((id) => {
    const element = document.getElementById(id) as FormElement;
    
    if (!element) {
      console.warn(`Elemento con ID '${id}' no encontrado durante la actualización`);
      return;
    }
    
    if ('value' in element && element.value !== undefined) {
      setFormValue(id, element.value);
    }
  });
}

/**
 * Prepara los datos del formulario para el envío
 * @returns FormData preparado para enviar al servidor
 */
function prepareFormDataForSubmission(): FormData {
  // Actualizar datos del formulario
  updateFormDataFromElements();
  
  // Generar parámetros de inicio del servidor
  formData.startParameters = generateNewServerStart(
    Number(formData.Ramsize), 
    formData.optiflags
  );
  
  console.log('Datos del formulario preparados:', formData);
  
  const submissionData = new FormData();
  submissionData.append("jsonData", JSON.stringify(formData));
  
  // Añadir archivo si está en el tab correcto y hay un archivo seleccionado
  const selectedFile = getSelectedFile("fileName");
  if (selectedFile && tabsSignal.value.index === 1) {
    submissionData.append("file", selectedFile);
    console.log('Archivo añadido al formulario:', selectedFile.name);
  }
  
  return submissionData;
}

/**
 * Maneja la respuesta del servidor después del envío del formulario
 * @param result - Resultado de la operación del servidor
 */
function handleServerResponse(result: any): void {
  if (result?.success) {
    const successMessage = result.message || 'La operación fue un éxito rotundo.';
    showDialogWithMessageLocal(notifier => {
      notifier.setType('success', successMessage, 'Creando Server!');
    });
  } else {
    const errorMessage = `Error al enviar el formulario: ${result?.error || 'Error desconocido'}`;
    showDialogWithMessageLocal(notifier => {
      notifier.setType('error', errorMessage, 'Error');
    });
  }
}

/**
 * Manejador principal del evento de envío del formulario
 */
async function handleFormSubmission(event: Event): Promise<void> {
  try {
    const submissionData = prepareFormDataForSubmission();
    
    console.log('Enviando datos al servidor...');
    const result = await serverapi.postNewserver(submissionData);
    
    console.log('Respuesta del servidor:', result);
    handleServerResponse(result);
    
  } catch (error) {
    console.error('Error durante el envío del formulario:', error);
    
    showDialogWithMessageLocal(notifier => {
      notifier.setType('error', 
        `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
        'Error de Conexión'
      );
    });
  }
}

// Configurar el event listener para el envío del formulario
document.addEventListener('formSubmit', handleFormSubmission);
/*
  const { index, item } = tabsSignal.value as TabButtonData;
  console.log(index, item);
*/

/**
 * Maneja los cambios en las pestañas del formulario
 * @param value - Nuevos datos de la pestaña
 * @param oldValue - Datos anteriores de la pestaña
 */
function handleTabChange(value: TabButtonData, oldValue: TabButtonData): void {
  const { index } = value;
  
  console.log('Cambio de pestaña detectado:', { value, oldValue, currentFormData: formData });
  
  // Limpiar versión del core cuando se cambia a la pestaña de subida de archivo (index 1)
  if (index === 1) {
    const coreVersionElement = document.getElementById("coreVersion") as FormElement;
    
    if (coreVersionElement) {
      console.log('Limpiando versión del core para pestaña de archivo');
      
      if ('Values' in coreVersionElement) {
        coreVersionElement.Values = null;
      }
      
      formData.coreVersion = undefined;
    }
  }
}

// Suscribirse a los cambios de pestañas
signals.subscribe('tabs', handleTabChange);
// Referencias a elementos del DOM
const notificationDialog = document.getElementById('notificationDialog') as HTMLElement & DialogContainer;

/**
 * Función wrapper para mostrar diálogos de notificación
 * Mantiene compatibilidad con el código existente
 * @param action - Función que configura la notificación
 */
async function showDialogWithMessageLocal(
  action: (notifier: NotificationControls) => void
): Promise<void> {
  const NOTIFICATION_CONTENT_ID = 'notificationContent';
  const NOTIFICATION_DIALOG_SELECTOR = '#notificationDialog';
  
  try {
    await showDialogWithMessage(
      NOTIFICATION_CONTENT_ID, 
      action, 
      NOTIFICATION_DIALOG_SELECTOR
    );
  } catch (error) {
    console.error('Error al mostrar el diálogo de notificación:', error);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  // El componente Vue NotificationContent está listo para usar
  // Ejemplo de uso:
  /*
  showDialogWithMessageLocal(notifier => {
    notifier.setType('success', 'El componente Vue está funcionando correctamente!', '¡Éxito!');
    notifier.addButton({
      text: 'Cerrar',
      class: 'primary',
      onClick: () => {
        console.log('Notificación cerrada desde Vue component');
        const dialog = document.getElementById('notificationDialog') as any;
        if (dialog && typeof dialog.close === 'function') {
          dialog.close();
        }
      }
    });
  });
  */
});

``` 

