//const BASE_URL = "http://10.0.0.50:8080";
const BASE_URL = "https://10.0.0.50";
const plantaID = localStorage.getItem("plantaID");

// Función helper para hacer fetch con el token JWT
function fetchConToken(url, opciones = {}) {
  const token = localStorage.getItem("token");

  // Si el body es FormData, no agregar Content-Type
  const headers =
    opciones.body instanceof FormData
      ? { Authorization: `Bearer ${token}` }
      : {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

  return fetch(url, {
    ...opciones,
    headers: {
      ...headers,
      ...opciones.headers,
    },
  });
}

// 1. Verificar autenticación al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  // Si no hay token, redirigir al login
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Cargar sectores desde la BD en lugar de hardcodearlos
  await cargarSectoresDesdeBD(plantaID);
});

// 2. Manejo del formulario de subida
document
  .getElementById("formularioImagen")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    let formData = new FormData(this);
    const archivo = formData.get("imagen");
    const sector = formData.get("sector");

    // Validaciones
    if (!archivo || archivo.size === 0) {
      document.getElementById("mensaje").innerText =
        "Por favor selecciona un archivo";
      return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
      document.getElementById("mensaje").innerText =
        "El archivo debe ser menor a 10 MB";
      return;
    }

    // CORRECCIÓN: Agregar la planta al formulario antes de enviar
    formData.append("planta", plantaID);

    console.log(
      "Archivo:",
      archivo.name,
      "Tipo:",
      archivo.type,
      "Planta:",
      plantaID,
    );

    // Determinar URL
    let url = `${BASE_URL}/api/imagenes`; // URL Absoluta

    if (archivo.type === "application/pdf") {
      url += "/pdf";
      // Crear nuevo FormData para PDF si es necesario
      const pdfFormData = new FormData();
      pdfFormData.append("pdf", archivo);
      pdfFormData.append("sector", sector);
      pdfFormData.append("planta", plantaID); // Importante: Agregar planta aquí también
      formData = pdfFormData;
    }

    fetchConToken(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }
        return res.text();
      })
      .then((msg) => {
        const tipoArchivo =
          archivo.type === "application/pdf" ? "PDF" : "imagen";
        // CORRECCIÓN: Pasamos la planta en el enlace generado
        const enlace = `<br><a href="sector.html?sector=${sector}&planta=${plantaID}" target="_blank">Ver imágenes del sector ${sector}</a>`;

        document.getElementById("mensaje").innerHTML =
          `${tipoArchivo} procesado correctamente` + enlace;
        console.log(
          "Enlace generado:",
          `sector.html?sector=${sector}&planta=${plantaID}`,
        );

        this.reset();

        // Si estamos viendo el mismo sector en gestión, refrescar
        if (sectorActual === sector) {
          cargarImagenesGestion();
        }
      })
      .catch((err) => {
        document.getElementById("mensaje").innerText =
          "Error al subir el archivo (Verificar Backend)";
        console.error(err);
      });
  });

// 3. Función para abrir la visualización de un sector específico
function verSector(sector) {
  // CORRECCIÓN: Pasamos la planta por URL
  const url = `sector.html?sector=${sector}&planta=${plantaID}`;
  window.open(url, "_blank");

  const mensajeDiv = document.getElementById("mensaje");
  mensajeDiv.innerHTML = `Abriendo visualización del sector ${sector}...`;

  setTimeout(() => {
    mensajeDiv.innerHTML = "";
  }, 3000);
}

// 4. Función para cargar imágenes para gestión
async function cargarImagenesGestion() {
  const selector = document.getElementById("selectorSectorGestion");
  const sector = selector.value;
  const galeria = document.getElementById("galeriaImagenes");
  const contador = document.getElementById("contadorImagenes");

  if (!sector) {
    galeria.innerHTML = "";
    contador.style.display = "none";
    if (intervaloActualizacion) {
      clearInterval(intervaloActualizacion);
    }
    return;
  }

  sectorActual = sector;
  galeria.innerHTML = '<div class="cargando">Cargando imágenes...</div>';
  contador.style.display = "none";

  try {
    // CORRECCIÓN: URL Absoluta + Parámetro Planta
    const response = await fetchConToken(
      `${BASE_URL}/api/imagenes/${sector}?planta=${plantaID}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const imagenesData = await response.json();
    imagenesActuales = imagenesData;

    if (imagenesData.length === 0) {
      galeria.innerHTML =
        '<div class="sin-imagenes">No hay imágenes en este sector</div>';
      contador.style.display = "none";
      return;
    }

    // Mostrar contador
    contador.textContent = `${imagenesData.length} imagen${imagenesData.length !== 1 ? "s" : ""} encontrada${imagenesData.length !== 1 ? "s" : ""}`;
    contador.style.display = "block";

    // Crear galería
    galeria.innerHTML = "";
    imagenesData.forEach((imagen, index) => {
      const imagenDiv = document.createElement("div");
      imagenDiv.className = "imagen-item";

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
    console.error("Error al cargar imágenes:", error);
    galeria.innerHTML =
      '<div class="sin-imagenes">Error al cargar las imágenes (Conexión Backend)</div>';
    contador.style.display = "none";
  }
}

async function cargarSectoresDesdeBD(plantaID) {
  try {
    // Por ahora necesitamos el ID numérico de la planta
    // El backend devuelve el nombre, necesitamos buscar el id
    const response = await fetchConToken(
      `${BASE_URL}/api/plantas/${plantaID}/sectores`,
    );

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = "login.html";
        return;
      }
      throw new Error("Error al cargar sectores");
    }

    const sectores = await response.json();
    inicializarInterfazConSectores(sectores);
  } catch (error) {
    console.error("Error:", error);
    window.location.href = "login.html";
  }
}

function inicializarInterfazConSectores(sectores) {
  const esSuperAdmin = localStorage.getItem("rol") === "SUPERADMIN";

  // Select de subida
  const selectSubida = document.getElementById("selectSectorSubida");
  if (selectSubida) {
    sectores.forEach((sector) => {
      const option = document.createElement("option");
      option.value = sector.nombre;
      // Si es superadmin, mostrar también la planta
      option.textContent = esSuperAdmin
        ? `${sector.planta.nombreDisplay} — ${sector.nombreDisplay}`
        : sector.nombreDisplay;
      selectSubida.appendChild(option);
    });
  }

  // Botones de visualización
  const contenedorBotones = document.getElementById("contenedorBotones");
  if (contenedorBotones) {
    contenedorBotones.innerHTML = "";
    sectores.forEach((sector) => {
      const btn = document.createElement("button");
      btn.className = "boton-sector";
      btn.textContent = esSuperAdmin
        ? `${sector.planta.nombreDisplay} — ${sector.nombreDisplay}`
        : sector.nombreDisplay;
      btn.onclick = () => verSector(sector.nombre);
      contenedorBotones.appendChild(btn);
    });
  }

  // Select de gestión
  const selectGestion = document.getElementById("selectorSectorGestion");
  if (selectGestion) {
    selectGestion.innerHTML = "";
    const opcionDefault = document.createElement("option");
    opcionDefault.value = "";
    opcionDefault.textContent = "Seleccionar Sector...";
    opcionDefault.disabled = true;
    opcionDefault.selected = true;
    selectGestion.appendChild(opcionDefault);

    sectores.forEach((sector) => {
      const option = document.createElement("option");
      option.value = sector.nombre;
      option.textContent = esSuperAdmin
        ? `${sector.planta.nombreDisplay} — ${sector.nombreDisplay}`
        : sector.nombreDisplay;
      selectGestion.appendChild(option);
    });
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
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Imagen no encontrada");
      }
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const resultado = await response.json();
    console.log("Imagen eliminada:", resultado.message);

    // Refrescar la galería
    cargarImagenesGestion();
    mostrarMensaje("Imagen eliminada correctamente", "success");
  } catch (error) {
    console.error("Error al eliminar imagen:", error);
    mostrarMensaje(`Error al eliminar la imagen: ${error.message}`, "error");
  }
}

// 6. Función para eliminar todas las imágenes de un sector
function eliminarTodasImagenesSector() {
  const sector = document.getElementById("selectorSectorGestion").value;

  if (!sector) {
    alert("Por favor selecciona un sector primero");
    return;
  }

  const imagenesEnPantalla = document.querySelectorAll(".imagen-item").length;

  if (imagenesEnPantalla === 0) {
    alert("No hay imágenes para eliminar en este sector");
    return;
  }

  if (
    !confirm(
      `¿Eliminar ${imagenesEnPantalla} imágenes del sector "${sector}"?\n\nEsta acción NO se puede deshacer.`,
    )
  ) {
    return;
  }

  const mensajeElement = document.getElementById("mensaje");
  if (mensajeElement) {
    mensajeElement.innerHTML = "Eliminando todas las imágenes...";
  }

  // CORRECCIÓN: URL Absoluta + Parámetro Planta
  fetch(`${BASE_URL}/api/imagenes/sector/${sector}?planta=${plantaID}`, {
    method: "DELETE",
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errorData) => {
          throw new Error(errorData.error || `Error HTTP: ${res.status}`);
        });
      }
      return res.json();
    })
    .then((data) => {
      if (mensajeElement) mensajeElement.innerHTML = `${data.message}`;
      else alert(`${data.message}`);

      // Recargar automáticamente las imágenes del sector
      cargarImagenesGestion();
    })
    .catch((error) => {
      if (mensajeElement) mensajeElement.innerHTML = `Error: ${error.message}`;
      else alert(`Error: ${error.message}`);
      console.error("Error:", error);
    });
}

// 7. Función auxiliar para mostrar mensajes
function mostrarMensaje(texto, tipo) {
  const mensajeDiv = document.getElementById("mensaje");
  if (mensajeDiv) {
    const color = tipo === "success" ? "green" : "red";
    mensajeDiv.innerHTML = `<span style="color: ${color};">${texto}</span>`;

    setTimeout(() => {
      mensajeDiv.innerHTML = "";
    }, 3000);
  } else {
    alert(`${texto}`);
  }
}
