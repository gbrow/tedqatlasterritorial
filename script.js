// Variáveis globais
let dadosOriginais = [];
let dadosFiltrados = [];
let temasChart, municipiosChart, dataTable;
let formatosChart, subtemasChart; 
// Garante que os objetos de gráfico existam
window.temasChart = null;
window.municipiosChart = null;
window.formatosChart = null;
window.subtemasChart = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
  //document.getElementById('btnCarregar').addEventListener('click', carregarCSV);
  console.log('DOM carregado, elementos encontrados:', {
    tableContainer: document.getElementById('tableContainer'),
    dadosTable: document.getElementById('dadosTable')
  });
  carregarCSV();
});
// Variável para armazenar alturas personalizadas
const customHeights = {};
// Carrega e processa o CSV
function carregarCSV() {
 const loader = document.createElement('div');
  loader.style.position = 'fixed';
  loader.style.top = '0';
  loader.style.left = '0';
  loader.style.width = '100%';
  loader.style.height = '100%';
  loader.style.backgroundColor = 'rgba(0,0,0,0.5)';
  loader.style.display = 'flex';
  loader.style.justifyContent = 'center';
  loader.style.alignItems = 'center';
  loader.style.zIndex = '1000';
  loader.innerHTML = '<div style="color:white;font-size:24px;">Carregando dados...</div>';
  document.body.appendChild(loader);

  // Caminho relativo para o arquivo CSV
  const csvPath = window.location.pathname.includes('/dados/') 
    ? 'ATLAS-QUANTIFICACAO.csv' 
    : '/dados/ATLAS-QUANTIFICACAO.csv';
  
  console.log('Tentando carregar de:', csvPath); // Verifique no console

  // Usando fetch para carregar o arquivo
  fetch(csvPath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erro HTTP! status: ${response.status}`);
      }
      return response.text();
    })
    .then(csvText => {

      Papa.parse(csvText, {  
        header: true,
        delimiter: ';',
        complete: function(results) {
          if (!results.data || results.data.length === 0) {
            alert('O arquivo CSV está vazio ou mal formatado!');
            return;
          }
          try{
            console.log(results.data);
            dadosOriginais = results.data.filter(row => Object.keys(row).length > 0);
            inicializarFiltros(dadosOriginais);
            aplicarFiltros();
            initAll();
          } catch (e) {
            console.error('Erro no processamento:', e);
            alert('Erro ao processar dados. Verifique o console.');
          } finally {
            document.body.removeChild(loader);
          }

        },
        error: function(error) {
          console.error('Erro ao ler CSV:', error);
          alert(`Erro ao processar o arquivo: ${error.message}`);
        }
      });
})
    .catch(error => {
      document.body.removeChild(loader);
      console.error('Erro ao carregar arquivo:', error);
      alert(`ERRO: ${error.message}\n\nVerifique:\n1. O arquivo existe em ${csvPath}\n2. O servidor permite acesso (CORS)\n3. O nome do arquivo está correto (maiúsculas/minúsculas)`);
    });
}

// Inicializa filtros
function inicializarFiltros(dados) {
  const temas = [...new Set(dados.map(row => row.TEMA))].filter(Boolean);
  const municipios = [...new Set(dados.map(row => row.Recorte))].filter(Boolean);

  const temaFilter = document.getElementById('temaFilter');
  const municipioFilter = document.getElementById('municipioFilter');

  temaFilter.innerHTML = '<option value="">Todos</option>';
  temas.forEach(tema => {
    temaFilter.appendChild(new Option(tema, tema));
  });

  municipioFilter.innerHTML = '<option value="">Todos</option>';
  municipios.forEach(municipio => {
    municipioFilter.appendChild(new Option(municipio, municipio));
  });

  temaFilter.disabled = false;
  municipioFilter.disabled = false;

  temaFilter.addEventListener('change', aplicarFiltros);
  municipioFilter.addEventListener('change', aplicarFiltros);
}

// Aplica filtros
function aplicarFiltros() {
  try {
    const tema = document.getElementById('temaFilter').value;
    const municipio = document.getElementById('municipioFilter').value;

    dadosFiltrados = dadosOriginais.filter(row => {
      const rowTema = row.TEMA || '';
      const rowMunicipio = row.Recorte || '';
      
      return (!tema || rowTema.includes(tema)) &&
             (!municipio || rowMunicipio.includes(municipio));
    });

    console.log('Dados filtrados:', dadosFiltrados);
    
    destruirGraficos();
    
    // Atualiza visualizações em sequência controlada
    setTimeout(() => {
      atualizarGraficoTemas();
      setTimeout(() => {
        atualizarGraficoMunicipios();
        setTimeout(() => {
          atualizarGraficoSubtemas();
          setTimeout(() => {
            atualizarGraficoFormatos();
            setTimeout(() => {
              atualizarTabelaAgrupada();
              atualizarTabelaCompleta();
            }, 100);
          }, 100);
        }, 100);
      }, 100);
    }, 100);
    
  } catch (error) {
    console.error('Erro ao aplicar filtros:', error);
    alert('Ocorreu um erro ao processar os filtros. Verifique o console para detalhes.');
  }
}

function destruirGraficos() {
  const charts = [
    'temasChart',
    'municipiosChart',
    'formatosChart',
    'subtemasChart'
  ];

  charts.forEach(chartName => {
    try {
      if (window[chartName] && typeof window[chartName].destroy === 'function') {
        window[chartName].destroy();
      }
      window[chartName] = null;
    } catch (e) {
      console.error(`Erro ao destruir gráfico ${chartName}:`, e);
    }
  });

  // Destruir a tabela DataTable se existir
  const table = document.getElementById('dadosTable');
  if (window.dataTable && $.fn.DataTable.isDataTable(table)) {
    try {
      window.dataTable.destroy(true);
    } catch (e) {
      console.error('Erro ao destruir DataTable:', e);
    }
  }
  window.dataTable = null;
}

// Atualiza todas as visualizações
function atualizarVisualizacoes() {
  atualizarGraficoTemas();
  atualizarGraficoMunicipios();
  atualizarTabelaAgrupada();
  atualizarTabelaCompleta();
  atualizarGraficoFormatos();      // Novo
  atualizarGraficoSubtemas();      // Novo

  adicionarBotoesExport();
}

// Gráfico de barras (Temas)
function atualizarGraficoTemas() {
  const ctx = getChartContext('temasChart');
  if (!ctx) return;

  const temas = [...new Set(dadosFiltrados.map(row => row.TEMA || 'Sem tema'))];
  const contagem = temas.map(tema => 
    dadosFiltrados.filter(row => (row.TEMA || 'Sem tema') === tema).length
  );

  if (window.temasChart && typeof window.temasChart.destroy === 'function') {
    window.temasChart.destroy();
  }

  window.temasChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: temas,
      datasets: [{
        label: 'Quantidade',
        data: contagem,
        backgroundColor: '#4e79a7',
      }]
    },
    options: {
      responsive: true,
      plugins: {
      title: {
        display: true,
        text: 'Distribuição por Tema',
        font: {
          size: 16
        }
      },
      legend: {
        labels: {
          font: {
            size: 14
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          font: {
            size: 12
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 12
          }
        }
      }
    }
    }
  });
}

// Gráfico de pizza (Municípios)
function atualizarGraficoMunicipios() {
  const ctx = document.getElementById('municipiosChart');
  if (!ctx) return;

  if (window.municipiosChart) window.municipiosChart.destroy();

  const municipios = [...new Set(dadosFiltrados.map(row => row.Recorte))];
  const contagem = municipios.map(municipio => 
    dadosFiltrados.filter(row => row.Recorte === municipio).length
  );

  // Gerar cores únicas
  const backgroundColors = municipios.map((_, i) => {
    const hue = (i * 360 / municipios.length) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  });

  window.municipiosChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: municipios,
      datasets: [{
        data: contagem,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            generateLabels: function(chart) {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: `${label} (${data.datasets[0].data[i]})`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i
              }));
            }
          }
        }
      }
    }
  });
}

// Tabela agrupada (Tema x Município)
function atualizarTabelaCompleta() {
  try {
    // 1. Verificar se o container existe
    const container = document.getElementById('tableContainer');
    if (!container) {
      console.error('Elemento #tableContainer não encontrado no DOM');
      return;
    }

    // 2. Destruir tabela existente de forma segura
    const existingTable = document.getElementById('dadosTable');
    if (window.dataTable && existingTable && $.fn.DataTable.isDataTable(existingTable)) {
      try {
        window.dataTable.destroy(true);
      } catch (e) {
        console.warn('Erro ao destruir DataTable:', e);
      }
    }

    // 3. Limpar container de forma segura
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // 4. Criar nova tabela
    const newTable = document.createElement('table');
    newTable.id = 'dadosTable';
    newTable.className = 'display';
    newTable.style.width = '100%';
    container.appendChild(newTable);

    // 5. Verificar dados
    if (!dadosFiltrados || dadosFiltrados.length === 0) {
      newTable.innerHTML = `
        <thead><tr><th>Sem dados</th></tr></thead>
        <tbody><tr><td>Nenhum registro encontrado</td></tr></tbody>
      `;
      return;
    }

    // 6. Inicializar DataTable
    window.dataTable = $(newTable).DataTable({
      data: dadosFiltrados,
      columns: [
        { title: "Tipo", data: "Tipo" },
        { title: "Tema", data: "TEMA" },
        { title: "Subtema", data: "SUBTEMA" },
        { title: "Município", data: "Recorte" },
        { title: "Formato", data: "Formato" },
        { title: "Fonte", data: "Fonte" }
      ],
      dom: 'Bfrtip',
      buttons: ['csv'],
      pageLength: 10,
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json'
      }
    });

  } catch (error) {
    console.error('Erro em atualizarTabelaCompleta:', error);
    // Fallback básico caso tudo falhe
    const fallbackDiv = document.createElement('div');
    fallbackDiv.innerHTML = '<p>Erro ao carregar tabela. Recarregue a página.</p>';
    document.querySelector('.container').appendChild(fallbackDiv);
  }
}

// Tabela completa com DataTables
function atualizarTabelaAgrupada() {
  const container = document.getElementById('tabelaAgrupada');
  const temas = [...new Set(dadosFiltrados.map(row => row.TEMA))].filter(Boolean);
  const municipios = [...new Set(dadosFiltrados.map(row => row.Recorte))].filter(Boolean);

  // Calcular valores máximos para normalização
  const valores = [];
  temas.forEach(tema => {
    municipios.forEach(municipio => {
      const count = dadosFiltrados.filter(row => 
        row.TEMA === tema && row.Recorte === municipio
      ).length;
      valores.push(count);
    });
  });
  const maxVal = Math.max(...valores);

  let html = '<table class="gradient-table"><tr><th>Tema/Município</th>';
  
  // Cabeçalho
  municipios.forEach(municipio => {
    html += `<th>${municipio}</th>`;
  });
  html += '</tr>';

  // Linhas
  temas.forEach(tema => {
    html += `<tr><td>${tema}</td>`;
    municipios.forEach(municipio => {
      const count = dadosFiltrados.filter(row => 
        row.TEMA === tema && row.Recorte === municipio
      ).length;
      const intensidade = maxVal > 0 ? Math.round((count / maxVal) * 100) : 0;
      html += `<td style="background-color: rgba(78, 121, 167, ${(intensidade+0.4)/50})"></td>`;
      //html += `<td style="background-color: rgba(78, 121, 167, ${(intensidade+0.4)/50})">${count || ''}</td>`;
    });
    html += '</tr>';
  });

  html += '</table>';
  container.innerHTML = html;
}

function atualizarGraficoFormatos() {
  const ctx = document.getElementById('formatosChart');
  if (!ctx) return;



  // Contagem de formatos
  const formatos = [...new Set(dadosFiltrados.map(row => row.Formato || 'Sem formato'))];
  const contagem = formatos.map(formato => 
    dadosFiltrados.filter(row => (row.Formato || 'Sem formato') === formato).length
  );

  // Cores dinâmicas
  const backgroundColors = formatos.map((_, i) => {
    const hue = (i * 360 / formatos.length) % 360;
    return `hsla(${hue}, 70%, 60%, 0.7)`;
  });

  // Destruir gráfico anterior de forma segura
  if (window.formatosChart && typeof window.formatosChart.destroy === 'function') {
    window.formatosChart.destroy();
  }

  window.formatosChart = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: formatos,
      datasets: [{
        data: contagem,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Distribuição de Formatos de Dados'
        },
        legend: {
          position: 'right'
        }
      },
      scales: {
        r: {
          beginAtZero: true
        }
      }
    }
  });
}

function atualizarGraficoSubtemas() {
  const ctx = document.getElementById('subtemasChart');
  if (!ctx) return;

  if (window.subtemasChart) window.subtemasChart.destroy();

  // Agrupar por tema e subtema
  const temas = [...new Set(dadosFiltrados.map(row => row.TEMA))].filter(Boolean);
  const todosSubtemas = [...new Set(dadosFiltrados.map(row => row.SUBTEMA))].filter(Boolean);

  // Cores únicas para cada subtema
  const subtemaCores = {};
  todosSubtemas.forEach((subtema, i) => {
    const hue = (i * 360 / todosSubtemas.length) % 360;
    subtemaCores[subtema] = `hsl(${hue}, 70%, 60%)`;
  });

  // Preparar datasets (cada tema vira uma série)
  const datasets = todosSubtemas.map(subtema => {
    return {
      label: subtema,
      data: temas.map(tema => 
        dadosFiltrados.filter(row => row.TEMA === tema && row.SUBTEMA === subtema).length
      ),
      backgroundColor: subtemaCores[subtema],
      borderWidth: 1
    };
  });

  window.subtemasChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: temas,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              return `Total: ${context.raw} (${Math.round((context.raw/total)*100)}% deste subtema)`;
            }
          }
        }
      }
    }
  });
}
// Função para exportar qualquer gráfico
function exportChart(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  
  // Cria um canvas temporário com alta resolução
  const tempCanvas = document.createElement('canvas');
  const container = canvas.closest('.chart-container');
  const scale = 2; // Fator de escala para melhor qualidade
  
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = (customHeights[chartId] || container.offsetHeight) * scale;
  
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.scale(scale, scale);
  tempCtx.drawImage(canvas, 0, 0);
  
  const link = document.createElement('a');
  link.download = `${chartId}-${new Date().toISOString().slice(0,10)}.png`;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}

// Adicione botões de exportação dinamicamente
function adicionarBotoesExport() {
  const containers = document.querySelectorAll('.chart-container');
  containers.forEach(container => {
    const chartId = container.querySelector('canvas')?.id;
    if (chartId && !container.querySelector('.export-btn')) {
      const btnGroup = document.createElement('div');
      btnGroup.className = 'chart-actions';
      btnGroup.innerHTML = `
        <button class="export-btn" onclick="exportChart('${chartId}')">Exportar PNG</button>
        <button class="export-btn" onclick="exportChartAsCSV('${chartId}')">Exportar Dados (CSV)</button>
      `;
      container.appendChild(btnGroup);
    }
  });
}

// Função para exportar dados como CSV
function exportChartAsCSV(chartId) {
  const chart = window[`${chartId}Chart`];
  if (!chart) return;

  let csvContent = "";
  
  if (chart.config.type === 'bar' || chart.config.type === 'line') {
    // Cabeçalho
    csvContent += "Categoria," + chart.data.datasets.map(d => d.label).join(",") + "\n";
    
    // Dados
    chart.data.labels.forEach((label, i) => {
      csvContent += label + "," + chart.data.datasets.map(d => d.data[i]).join(",") + "\n";
    });
  } else if (chart.config.type === 'pie' || chart.config.type === 'polarArea') {
    csvContent += "Item,Quantidade\n";
    chart.data.labels.forEach((label, i) => {
      csvContent += label + "," + chart.data.datasets[0].data[i] + "\n";
    });
  }

  const link = document.createElement('a');
  link.download = `${chartId}-data-${new Date().toISOString().slice(0,10)}.csv`;
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getChartContext(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) {
    console.error(`Elemento canvas #${chartId} não encontrado!`);
    return null;
  }
  return canvas.getContext('2d');
}


// Função para inicializar o redimensionamento
function initResizableContainers() {
  const containers = document.querySelectorAll('.chart-container');
  
  containers.forEach(container => {
    const canvas = container.querySelector('canvas');
    if (!canvas || !canvas.id) return;
    
    const handle = container.querySelector('.resize-handle') || document.createElement('div');
    handle.className = 'resize-handle';
    if (!container.querySelector('.resize-handle')) {
      container.appendChild(handle);
    }
    
    const chartId = canvas.id;
    customHeights[chartId] = container.offsetHeight;
    
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = container.offsetHeight;
      
      function doDrag(e) {
        container.style.height = `${Math.max(300, startHeight + e.clientY - startY)}px`;
        updateChartSize(chartId);
      }
      
      function stopDrag() {
        customHeights[chartId] = container.offsetHeight;
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
      }
      
      document.addEventListener('mousemove', doDrag);
      document.addEventListener('mouseup', stopDrag);
    });
  });
}
function initAll() {
  try {
    atualizarVisualizacoes();
    
    // Adicione um pequeno delay para garantir que o DOM foi atualizado
    setTimeout(() => {
      try {
        initResizableContainers();
        console.log('Componentes inicializados com sucesso');
      } catch (e) {
        console.error('Erro na inicialização secundária:', e);
      }
    }, 100);
  } catch (error) {
    console.error('Erro na inicialização principal:', error);
    alert('Ocorreu um erro ao inicializar. Verifique o console para detalhes.');
  }
}

// Função para atualizar o tamanho do gráfico
function updateChartSize(chartId) {
  if (!chartId) return;
  
  try {
    const chart = window[`${chartId}Chart`];
    const canvas = document.getElementById(chartId);
    
    if (chart && canvas) {
      // Atualiza o tamanho interno do canvas
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      chart.resize();
      chart.update();
    }
  } catch (error) {
    console.error(`Erro ao atualizar tamanho do gráfico ${chartId}:`, error);
  }
}


// Função para redefinir o tamanho
function resetChartSize(chartId) {
  const container = document.querySelector(`#${chartId}`).closest('.chart-container');
  container.style.height = '400px'; // Altura padrão
  customHeights[chartId] = 400;
  updateChartSize(chartId);
}

function exportTabelaAgrupada() {
  const tabela = document.getElementById('tabelaAgrupada');
  if (!tabela) {
    console.error('Elemento tabelaAgrupada não encontrado');
    return;
  }

  // Mostrar loader durante a conversão
  const loader = document.createElement('div');
  loader.style.position = 'fixed';
  loader.style.top = '0';
  loader.style.left = '0';
  loader.style.width = '100%';
  loader.style.height = '100%';
  loader.style.backgroundColor = 'rgba(0,0,0,0.5)';
  loader.style.display = 'flex';
  loader.style.justifyContent = 'center';
  loader.style.alignItems = 'center';
  loader.style.zIndex = '1000';
  loader.innerHTML = '<div style="color:white;font-size:24px;">Gerando imagem...</div>';
  document.body.appendChild(loader);

  // Configurações para melhor qualidade de imagem
  const options = {
    scale: 2,          // Aumenta a qualidade
    logging: false,     // Desativa logs
    useCORS: true,      // Permite recursos externos
    allowTaint: true,   // Permite imagens de diferentes origens
    backgroundColor: '#ffffff'  // Fundo branco
  };

  html2canvas(tabela, options).then(canvas => {
    // Criar link de download
    const link = document.createElement('a');
    link.download = `tabela-agrupada-${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    // Remover loader
    document.body.removeChild(loader);
  }).catch(error => {
    console.error('Erro ao gerar imagem:', error);
    alert('Erro ao exportar tabela como PNG');
    document.body.removeChild(loader);
  });
}
