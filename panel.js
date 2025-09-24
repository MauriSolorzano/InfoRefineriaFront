// Variables globales
    let imagenesActuales = [];
    let sectorActual = '';
    let intervaloActualizacion = null;

    // Verificar autenticación al cargar la página
    document.addEventListener("DOMContentLoaded", async() => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include"
        });
        console.log("Estado sesión:" + response.status);
        if (!response.ok) {
          window.location.href = "login.html";
          return;
        }
      } catch (error) {
        console.error("Error al verificar la sesión:", error);
        window.location.href = "login.html";
      }
    });

    // Manejo del formulario de subida
    document.getElementById('formularioImagen').addEventListener('submit', function (e) {
  e.preventDefault();

  let formData = new FormData(this);
  const archivo = formData.get('imagen'); // Cambiar a 'imagen'
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

  console.log("Archivo:", archivo.name, "Tipo:", archivo.type);

  // Determinar URL
  let url = '/api/imagenes';
  if (archivo.type === 'application/pdf') {
    url += '/pdf';
    // Crear nuevo FormData para PDF
    const pdfFormData = new FormData();
    pdfFormData.append('pdf', archivo);
    pdfFormData.append('sector', sector);
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
    const enlace = `<br><a href="sector.html?sector=${sector}" target="_blank">Ver imágenes del sector ${sector}</a>`;
    document.getElementById('mensaje').innerHTML = `${tipoArchivo} procesado correctamente` + enlace;
    console.log('Enlace generado:', `sector.html?sector=${sector}`);
    this.reset();
    
    // Si estamos viendo el mismo sector en gestión, refrescar
    if (sectorActual === sector) {
      cargarImagenesGestion();
    }
  })
  .catch(err => {
    document.getElementById('mensaje').innerText = 'Error al subir el archivo';
    console.error(err);
  });
});;

    // Función para abrir la visualización de un sector específico
    function verSector(sector) {
      const url = `sector.html?sector=${sector}`;
      window.open(url, '_blank');
      
      const mensajeDiv = document.getElementById('mensaje');
      mensajeDiv.innerHTML = `Abriendo visualización del sector ${sector}...`;
      
      setTimeout(() => {
        mensajeDiv.innerHTML = '';
      }, 3000);
    }

    // Función para cargar imágenes para gestión
    async function cargarImagenesGestion() {
    const selector = document.getElementById('selectorSectorGestion');
    const sector = selector.value;
    const galeria = document.getElementById('galeriaImagenes');
    const contador = document.getElementById('contadorImagenes');

    if (!sector) {
        galeria.innerHTML = '';
        contador.style.display = 'none';
        if(intervaloActualizacion){
            clearInterval(intervaloActualizacion);
        }
        return;
    }

    sectorActual = sector;
    galeria.innerHTML = '<div class="cargando">Cargando imágenes...</div>';
    contador.style.display = 'none';

    try {
        const response = await fetch(`/api/imagenes/${sector}`, {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        // Ahora recibimos objetos, no strings de rutas
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

        // Crear galería - USANDO OBJETOS, NO STRINGS
        galeria.innerHTML = '';
        imagenesData.forEach((imagen, index) => {
            const imagenDiv = document.createElement('div');
            imagenDiv.className = 'imagen-item';
            
            const urlCompleta = `/api${imagen.ruta}`;
            
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

        if(!intervaloActualizacion){
            intervaloActualizacion = setInterval(() => {
                cargarImagenesGestion();
            }, 30000); // Cada 30 segundos
        }

    } catch (error) {
        console.error('Error al cargar imágenes:', error);
        galeria.innerHTML = '<div class="sin-imagenes">Error al cargar las imágenes del sector</div>';
        contador.style.display = 'none';
    }
}

    // Función para eliminar imagen por ID
    async function eliminarImagenPorId(imagenId, nombreArchivo) {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${nombreArchivo}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/imagenes/${imagenId}`, {
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

        // Mostrar mensaje de éxito
        mostrarMensaje('Imagen eliminada correctamente', 'success');

    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        mostrarMensaje(`Error al eliminar la imagen: ${error.message}`, 'error');
    }
} 

    // Función para mostrar mensajes
    function mostrarMensaje(texto, tipo) {
      const mensajeDiv = document.getElementById('mensaje');
      if (mensajeDiv) {
        const color = tipo === 'success' ? 'green' : 'red';
        mensajeDiv.innerHTML = `<span style="color: ${color};">${texto}</span>`;
        
        setTimeout(() => {
            mensajeDiv.innerHTML = '';
        }, 3000);
    } else {
        console.log(`${tipo.toUpperCase()}: ${texto}`);
        alert(`${texto}`);
    }
}



    // Función para eliminar una imagen
    async function eliminarImagen(rutaImagen, index) {
    const nombreArchivo = rutaImagen.split('/').pop(); // Extraer nombre del archivo
    
    if (!confirm(`¿Estás seguro de que quieres eliminar "${nombreArchivo}"?`)) {
        return;
    }

    try {
        // 1. Primero obtener todas las imágenes del sector para encontrar el ID
        const sectorSeleccionado = document.getElementById('selectorSectorGestion').value;
        const responseImagenes = await fetch(`/api/imagenes/${sectorSeleccionado}`, {
            credentials: "include"
        });
        
        if (!responseImagenes.ok) {
            throw new Error('Error al obtener imágenes del sector');
        }
        
        const imagenes = await responseImagenes.json();
        
        // 2. Buscar la imagen por nombre de archivo
        const imagen = imagenes.find(img => {
            // Comparar solo el nombre del archivo, no la ruta completa
            const nombreImagen = img.ruta ? img.ruta.split('/').pop() : img.nombreArchivo;
            return nombreImagen === nombreArchivo;
        });
        
        if (!imagen || !imagen.id) {
            throw new Error('No se pudo encontrar el ID de la imagen');
        }

        // 3. Eliminar usando el ID encontrado
        const response = await fetch(`/api/imagenes/${imagen.id}`, {
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

        // Mostrar mensaje de éxito
        mostrarMensaje('Imagen eliminada correctamente', 'success');

    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        mostrarMensaje(`Error al eliminar la imagen: ${error.message}`, 'error');
    }
}

// Función para eliminar todas las imágenes de un sector
  function eliminarTodasImagenesSector() {
    const sector = document.getElementById('selectorSectorGestion').value;
    
    if (!sector) {
        alert('Por favor selecciona un sector primero');
        return;
    }
    
    // Contar imágenes actuales
    const imagenesActuales = document.querySelectorAll('.imagen-item').length;
    
    if (imagenesActuales === 0) {
        alert('No hay imágenes para eliminar en este sector');
        return;
    }
    
    const confirmacion = confirm(`¿Eliminar ${imagenesActuales} imágenes del sector "${sector}"?\n\nEsta acción NO se puede deshacer.`);
    
    // Mostrar indicador de carga - con verificación
    const mensajeElement = document.getElementById('mensaje') || 
                          document.getElementById('mensajes') || 
                          document.getElementById('mensajeGestion');
    
    if (mensajeElement) {
        mensajeElement.innerHTML = 'Eliminando todas las imágenes...';
    }
    
    fetch(`/api/imagenes/sector/${sector}`, {
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
        if (mensajeElement) {
            mensajeElement.innerHTML = `${data.message}`;
        } else {
            alert(`${data.message}`); 
        }
        
        // Limpiar la lista de imágenes
        const listaImagenes = document.getElementById('listaImagenes');
        if (listaImagenes) {
            listaImagenes.innerHTML = '';
        }
        
        // Recargar automáticamente las imágenes del sector
        cargarImagenesGestion();
        
    })
    .catch(error => {
        if (mensajeElement) {
            mensajeElement.innerHTML = `Error: ${error.message}`;
        } else {
            alert(`Error: ${error.message}`);
        }
        console.error('Error:', error);
    });
}