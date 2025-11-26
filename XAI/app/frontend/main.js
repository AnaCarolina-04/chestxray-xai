document.addEventListener("DOMContentLoaded", () => {
  // Sidebar: marcar active
  document.querySelectorAll(".icon-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".icon-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Helpers de preview
  const showPreview = (container, src) => {
    if (!container) return;
    container.innerHTML = "";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "preview";
    img.className = "preview-img";
    container.appendChild(img);
  };
  const showPlaceholder = (container, text) => {
    if (!container) return;
    container.innerHTML = `<div class="placeholder">${text}</div>`;
  };

  // Elementos de la página de upload (si existen)
  const fileInput = document.getElementById("fileInput");
  const orig = document.getElementById("originalPreview");
  const aff = document.getElementById("affectedPreview");
  const diagnosisTrue = document.querySelector(".diagnosis-body .diagnosis-true strong");
  const diagnosisChange = document.querySelector(".diagnosis-body .diagnosis-change strong");

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      // Previsualizar original inmediatamente
      const reader = new FileReader();
      reader.onload = () => showPreview(orig, reader.result);
      reader.readAsDataURL(file);

      // Indicar procesamiento en la zona afectada
      showPlaceholder(aff, "Procesando...");

      try {
        // Crear dos FormData (uno por request) ya que el cuerpo se consume
        const formDataPredict = new FormData();
        formDataPredict.append("file", file);

        const formDataGradcam = new FormData();
        formDataGradcam.append("file", file);

        // 1) Pedir diagnóstico
        const resPredict = await fetch("/api/predict", {
          method: "POST",
          body: formDataPredict
        });

        if (!resPredict.ok) {
          throw new Error("Respuesta predict: " + resPredict.status);
        }
        const jsonPredict = await resPredict.json();
        // Actualizar diagnóstico si viene
        if (jsonPredict.prediction && diagnosisTrue) {
          diagnosisTrue.textContent = jsonPredict.prediction;
        } else if (jsonPredict.prediction === undefined && diagnosisTrue) {
          diagnosisTrue.textContent = JSON.stringify(jsonPredict);
        }

        // 2) Pedir imagen procesada (grad-cam) como blob
        const resGrad = await fetch("/api/gradcam", {
          method: "POST",
          body: formDataGradcam
        });

        if (!resGrad.ok) {
          throw new Error("Respuesta gradcam: " + resGrad.status);
        }

        const blob = await resGrad.blob();
        const objectUrl = URL.createObjectURL(blob);
        showPreview(aff, objectUrl);

      } catch (err) {
        console.error(err);
        showPlaceholder(aff, "Error al procesar");
      }
    });
  }

  // Chart rendering: if Chart.js loaded and there's a placeholder or canvas, draw simple chart
  if (window.Chart) {
    let canvas = document.getElementById("chart");
    if (!canvas) {
      const placeholder = document.querySelector(".chart-placeholder");
      if (placeholder) {
        canvas = document.createElement("canvas");
        canvas.id = "chart";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        placeholder.innerHTML = ""; // clear text
        placeholder.appendChild(canvas);
      }
    }

    if (canvas) {
      try {
        const ctx = canvas.getContext("2d");
        const labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul"];
        const data = {
          labels,
          datasets: [{
            label: "Casos",
            data: [12, 19, 8, 15, 22, 18, 24],
            borderColor: "rgba(124,77,216,0.9)",
            backgroundColor: "rgba(124,77,216,0.14)",
            fill: true,
            tension: 0.3
          }]
        };
        new Chart(ctx, {
          type: "line",
          data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,0.7)" } },
              y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "rgba(255,255,255,0.7)" } }
            }
          }
        });
      } catch (err) {
        // silent fail
      }
    }
  }

  // Placeholder behavior for kebab/menu (noop)
});
