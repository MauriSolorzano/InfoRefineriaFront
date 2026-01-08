// ==========================================
// CONFIGURACIÓN LOCAL
// ==========================================
const BASE_URL = "http://localhost:8080";
const plantaID = localStorage.getItem('plantaID');
// ==========================================

const CONFIG_SECTORES = {
    'CORDOBA': [
        {id: 'ENVASE', nombre: 'Envase'},
        {id: 'PANELISTAS', nombre: 'Panelistas'},
        {id: 'CALIDAD', nombre: 'Calidad'},
        {id: 'MANTENIMIENTO', nombre: 'Mantenimiento'},
        {id: 'LEVADURA', nombre: 'Levadura'},
        {id: 'LEVADURA_CONTROL', nombre: 'Levadura Control'}
    ],
    'VILLA_MERCEDES': [
        {id: 'PRODUCCION', nombre: 'Produccion'},
        {id: 'MANTENIMIENTO', nombre: 'Mantenimiento'},
    ],
    'DEFAULT': []
}

// Variables globales
let imagenesActuales = [];
let sectorActual = '';
let intervaloActualizacion = null;

// 1. Verificar autenticación al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // CORRECCIÓN: Usamos BASE_URL
        const response = await fetch(`${BASE_URL}/api/user`, {
            credentials: "include"
        });
        
        console.log("Estado sesión:" + response.status);
        
        if (!response.ok) {
            window.location.href = "login.html";
            return;
        }
        
        // Opcional: Mostrar en consola en qué planta estamos
        console.log("Conectado a planta:", plantaID);

    } catch (error) {
        console.error("Error al verificar la sesión:", error);
        window.location.href = "login.html";
    }

    inicializarInterfazPorPlanta();

    function inicializarInterfazPorPlanta() {
    // 1. Identificar planta actual
    // Si la planta no existe en la config, usamos DEFAULT
    const sectoresAmostrar = CONFIG_SECTORES[plantaID] || CONFIG_SECTORES['DEFAULT'];

    console.log("Cargando sectores para:", plantaID);

    // 2. Llenar el Select de SUBIDA
    const selectSubida = document.getElementById('selectSectorSubida');
    if (selectSubida) {
        sectoresAmostrar.forEach(sector => {
            const option = document.createElement('option');
            option.value = sector.id;
            option.textContent = sector.nombre;
            selectSubida.appendChild(option);
        });
    }

    // 3. Llenar los BOTONES de visualización
    const contenedorBotones = document.getElementById('contenedorBotones');
    if (contenedorBotones) {
        contenedorBotones.innerHTML = ''; // Limpiar por si acaso
        sectoresAmostrar.forEach(sector => {
            const btn = document.createElement('button');
            btn.className = 'boton-sector';
            btn.textContent = sector.nombre;
            // Asignar el evento click
            btn.onclick = () => verSector(sector.id);
            contenedorBotones.appendChild(btn);
        });
    }

    // 4. Llenar el Select de GESTIÓN
    const selectGestion = document.getElementById('selectorSectorGestion');
    if (selectGestion) {
        sectoresAmostrar.forEach(sector => {
            const option = document.createElement('option');
            option.value = sector.id;
            option.textContent = sector.nombre;
            selectGestion.appendChild(option);
        });
    }
}
});

// 2. Manejo del formulario de subida
document.getElementById('formularioImagen').addEventListener('submit', function (e) {
    e.preventDefault();

    let formData = new FormData(this);
    const archivo = formData.get('imagen');
    const sector = formData.get('sector');

    // Validaciones
    if (!archivo || archivo.size === 0) {
        document.getElementById('mensaje').innerText = 'Por favor selecciona un archivo';
        return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
        document.getElementById('mensaje').innerText = 'El archivo debe ser menor a 10 MB';
        return;
    }

    // CORRECCIÓN: Agregar la planta al formulario antes de enviar
    formData.append('planta', plantaID);

    console.log("Archivo:", archivo.name, "Tipo:", archivo.type, "Planta:", plantaID);

    // Determinar URL
    let url = `${BASE_URL}/api/imagenes`; // URL Absoluta

    if (archivo.type === 'application/pdf') {
        url += '/pdf';
        // Crear nuevo FormData para PDF si es necesario
        const pdfFormData = new FormData();
        pdfFormData.append('pdf', archivo);
        pdfFormData.append('sector', sector);
        pdfFormData.append('planta', plantaID); // Importante: Agregar planta aquí también
        formData = pdfFormData;
    }

    fetch(url, {
        method: 'POST',
        body: formData,
        credentials: "include"
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        return res.text();
    })
    .then(msg => {
        const tipoArchivo = archivo.type === 'application/pdf' ? 'PDF' : 'imagen';
        // CORRECCIÓN: Pasamos la planta en el enlace generado
        const enlace = `<br><a href="sector.html?sector=${sector}&planta=${plantaID}" target="_blank">Ver imágenes del sector ${sector}</a>`;
        
        document.getElementById('mensaje').innerHTML = `${tipoArchivo} procesado correctamente` + enlace;
        console.log('Enlace generado:', `sector.html?sector=${sector}&planta=${plantaID}`);
        
        this.reset();

        // Si estamos viendo el mismo sector en gestión, refrescar
        if (sectorActual === sector) {
            cargarImagenesGestion();
        }
    })
    .catch(err => {
        document.getElementById('mensaje').innerText = 'Error al subir el archivo (Verificar Backend)';
        console.error(err);
    });
});

// 3. Función para abrir la visualización de un sector específico
function verSector(sector) {
    // CORRECCIÓN: Pasamos la planta por URL
    const url = `sector.html?sector=${sector}&planta=${plantaID}`;
    window.open(url, '_blank');

    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.innerHTML = `Abriendo visualización del sector ${sector}...`;

    setTimeout(() => {
        mensajeDiv.innerHTML = '';
    }, 3000);
}

// 4. Función para cargar imágenes para gestión
async function cargarImagenesGestion() {
    const selector = document.getElementById('selectorSectorGestion');
    const sector = selector.value;
    const galeria = document.getElementById('galeriaImagenes');
    const contador = document.getElementById('contadorImagenes');

    if (!sector) {
        galeria.innerHTML = '';
        contador.style.display = 'none';
        if (intervaloActualizacion) {
            clearInterval(intervaloActualizacion);
        }
        return;
    }

    sectorActual = sector;
    galeria.innerHTML = '<div class="cargando">Cargando imágenes...</div>';
    contador.style.display = 'none';

    try {
        // CORRECCIÓN: URL Absoluta + Parámetro Planta
        const response = await fetch(`${BASE_URL}/api/imagenes/${sector}?planta=${plantaID}`, {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const imagenesData = await response.json();
        imagenesActuales = imagenesData;

        if (imagenesData.length === 0) {
            galeria.innerHTML = '<div class="sin-imagenes">No hay imágenes en este sector</div>';
            contador.style.display = 'none';
            return;
        }

        // Mostrar contador
        contador.textContent = `${imagenesData.length} imagen${imagenesData.length !== 1 ? 's' : ''} encontrada${imagenesData.length !== 1 ? 's' : ''}`;
        contador.style.display = 'block';

        // Crear galería
        galeria.innerHTML = '';
        imagenesData.forEach((imagen, index) => {
            const imagenDiv = document.createElement('div');
            imagenDiv.className = 'imagen-item';

            // Asegurarse de que la ruta sea correcta (si el backend devuelve ruta relativa o absoluta)
            const urlCompleta = `${BASE_URL}${imagen.ruta}`;

            imagenDiv.innerHTML = `
                <img src="${urlCompleta}" alt="Imagen ${index + 1}" class="imagen-preview" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yIGFsIGNhcmdhcjwvdGV4dD48L3N2Zz4='">
                <div class="imagen-info">
                    <div class="imagen-nombre">${imagen.nombreArchivo}</div>
                    <button class="boton-eliminar" onclick="eliminarImagenPorId(${imagen.id}, '${imagen.nombreArchivo}')">
                        🗑️ Eliminar
                    </button>
                </div>
            `;

            galeria.appendChild(imagenDiv);
        });

        if (!intervaloActualizacion) {
            intervaloActualizacion = setInterval(() => {
                cargarImagenesGestion();
            }, 30000); // Cada 30 segundos
        }

    } catch (error) {
        console.error('Error al cargar imágenes:', error);
        galeria.innerHTML = '<div class="sin-imagenes">Error al cargar las imágenes (Conexión Backend)</div>';
        contador.style.display = 'none';
    }
}

// 5. Función para eliminar imagen por ID
async function eliminarImagenPorId(imagenId, nombreArchivo) {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${nombreArchivo}"?`)) {
        return;
    }

    try {
        // CORRECCIÓN: URL Absoluta
        const response = await fetch(`${BASE_URL}/api/imagenes/${imagenId}`, {
            method: 'DELETE',
            credentials: "include"
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Imagen no encontrada');
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const resultado = await response.json();
        console.log('Imagen eliminada:', resultado.message);

        // Refrescar la galería
        cargarImagenesGestion();
        mostrarMensaje('Imagen eliminada correctamente', 'success');

    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        mostrarMensaje(`Error al eliminar la imagen: ${error.message}`, 'error');
    }
}

// 6. Función para eliminar todas las imágenes de un sector
function eliminarTodasImagenesSector() {
    const sector = document.getElementById('selectorSectorGestion').value;

    if (!sector) {
        alert('Por favor selecciona un sector primero');
        return;
    }

    const imagenesEnPantalla = document.querySelectorAll('.imagen-item').length;

    if (imagenesEnPantalla === 0) {
        alert('No hay imágenes para eliminar en este sector');
        return;
    }

    if (!confirm(`¿Eliminar ${imagenesEnPantalla} imágenes del sector "${sector}"?\n\nEsta acción NO se puede deshacer.`)) {
        return;
    }

    const mensajeElement = document.getElementById('mensaje');
    if (mensajeElement) {
        mensajeElement.innerHTML = 'Eliminando todas las imágenes...';
    }

    // CORRECCIÓN: URL Absoluta + Parámetro Planta
    fetch(`${BASE_URL}/api/imagenes/sector/${sector}?planta=${plantaID}`, {
        method: 'DELETE',
        credentials: "include"
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errorData => {
                throw new Error(errorData.error || `Error HTTP: ${res.status}`);
            });
        }
        return res.json();
    })
    .then(data => {
        if (mensajeElement) mensajeElement.innerHTML = `${data.message}`;
        else alert(`${data.message}`);

        // Recargar automáticamente las imágenes del sector
        cargarImagenesGestion();
    })
    .catch(error => {
        if (mensajeElement) mensajeElement.innerHTML = `Error: ${error.message}`;
        else alert(`Error: ${error.message}`);
        console.error('Error:', error);
    });
}

// 7. Función auxiliar para mostrar mensajes
function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    if (mensajeDiv) {
        const color = tipo === 'success' ? 'green' : 'red';
        mensajeDiv.innerHTML = `<span style="color: ${color};">${texto}</span>`;

        setTimeout(() => {
            mensajeDiv.innerHTML = '';
        }, 3000);
    } else {
        alert(`${texto}`);
    }
}