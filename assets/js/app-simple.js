// DIAMIS Simulasi AI - Minimal Version
(function() {
  'use strict';

  function $(id) { return document.getElementById(id); }

  if (!document.body.dataset.page || document.body.dataset.page !== 'simulate') {
    return;
  }

  var demo = window.DIAMIS_DEMO || {};
  var questions = demo.questions || {};
  var baseRows = (demo.rows || []).concat(demo.extraBatchRows || []);
  var activeBatch = [];
  var selectedId = null;

  var btnLoadSample = $('btn-load-sample');
  var btnDownload = $('btn-download-sample');
  var fileInput = $('file-input');
  var uploadStatus = $('upload-status');
  var dashboard = $('dashboard');
  var inspectorSection = $('inspector-section');

  var kpiTotal = $('kpi-total');
  var kpiHidden = $('kpi-hidden');
  var kpiFalseCorrect = $('kpi-false-correct');
  var kpiAvgConf = $('kpi-avg-conf');
  var chartClasses = $('chart-classes');
  var chartLabels = $('chart-labels');

  var queueCount = $('queue-count');
  var queueList = $('batch-queue');
  var testForm = $('live-test-form');
  var selQuestion = $('test-question');
  var selAnswer = $('test-answer');
  var txtExplanation = $('test-explanation');

  var dxMeta = $('dx-meta');
  var dxTitle = $('dx-title');
  var dxCompare = $('dx-compare');
  var dxAutograder = $('dx-autograder');
  var dxDiamis = $('dx-diamis');
  var dxEvidence = $('dx-evidence');
  var dxQuote = $('dx-quote');
  var dxRationale = $('dx-rationale');
  var dxConf = $('dx-conf');
  var dxConfBars = $('dx-conf-bars');

  // Load sample
  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', function() {
      activeBatch = baseRows.slice(0, 20).map(evaluateRow);
      uploadStatus.textContent = 'Dimuat: 20 respons sampel dari 4 soal matematika.';
      dashboard.style.display = 'block';
      inspectorSection.style.display = 'block';
      renderDashboard();
      renderQueue();
      updateAnswerOptions();
    });
  }

  // Download sample CSV
  if (btnDownload) {
    btnDownload.addEventListener('click', function() {
      var csv = 'ID,Soal,Jawaban,Penjelasan\n';
      baseRows.slice(0, 10).forEach(function(r) {
        csv += r.id + ',' + r.question + ',' + r.answer + ',"' + r.explanation.replace(/"/g, '""') + '"\n';
      });
      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'diamis-contoh-unggahan.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Upload CSV
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        var text = evt.target.result;
        var rows = [];
        try {
          var isJson = /\.json$/i.test(file.name) || /^\s*[\[{]/.test(text);
          rows = isJson ? parseJSON(text) : parseCSV(text);
        } catch (err) {
          uploadStatus.textContent = 'Berkas tidak bisa dibaca. Periksa format CSV/JSON.';
          return;
        }
        if (rows.length === 0) {
          uploadStatus.textContent = 'CSV/JSON kosong atau format tidak valid.';
          return;
        }
        activeBatch = rows.map(evaluateRow);
        uploadStatus.textContent = 'Diunggah: ' + rows.length + ' respons dari berkas ' + file.name;
        dashboard.style.display = 'block';
        inspectorSection.style.display = 'block';
        renderDashboard();
        renderQueue();
      };
      reader.readAsText(file);
    });
  }

  // Live test form
  if (testForm) {
    selQuestion.addEventListener('change', updateAnswerOptions);
    testForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var q = selQuestion.value;
      var a = selAnswer.value;
      var exp = txtExplanation.value.trim();
      if (!exp) {
        alert('Ketik penjelasan siswa terlebih dahulu.');
        return;
      }
      var row = { id: 'UJI-LIVE', question: q, answer: a, explanation: exp };
      var item = evaluateRow(row);
      renderInspector(item);
    });
  }

  function updateAnswerOptions() {
    var qId = selQuestion.value;
    var qMeta = questions[qId] || questions.Q89443;
    selAnswer.innerHTML = '';
    qMeta.options.forEach(function(opt) {
      var option = document.createElement('option');
      option.value = opt;
      option.textContent = opt + (opt === qMeta.key ? ' (Kunci)' : '');
      selAnswer.appendChild(option);
    });
    if (qMeta.presets[0]) {
      selAnswer.value = qMeta.presets[0].answer;
      txtExplanation.value = qMeta.presets[0].text;
    }
  }

  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    var records = [];
    var record = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        record.push(field);
        field = '';
      } else if (ch === '\n') {
        record.push(field);
        records.push(record);
        record = [];
        field = '';
      } else if (ch !== '\r') {
        field += ch;
      }
    }

    if (field !== '' || record.length > 0) {
      record.push(field);
      records.push(record);
    }

    if (records.length < 2) return [];

    var header = records[0].map(function(h) { return h.trim().toLowerCase(); });
    var pos = {
      id: header.indexOf('id'),
      question: header.indexOf('soal'),
      answer: header.indexOf('jawaban'),
      explanation: header.indexOf('penjelasan')
    };
    var rows = [];

    for (var r = 1; r < records.length; r++) {
      var parts = records[r];
      if (parts.join('').trim() === '') continue;
      var get = function(key, fallback) {
        var index = pos[key];
        return index >= 0 ? (parts[index] || '').trim() : (parts[fallback] || '').trim();
      };
      var explanation = get('explanation', 3);
      if (!explanation) continue;
      rows.push({
        id: get('id', 0),
        question: get('question', 1),
        answer: get('answer', 2),
        explanation: explanation
      });
    }
    return rows;
  }

  function parseJSON(text) {
    var data = JSON.parse(text);
    if (!Array.isArray(data)) {
      data = data.rows || data.data || data.responses || [];
    }

    function pick(row, keys) {
      for (var i = 0; i < keys.length; i++) {
        var value = row[keys[i]];
        if (value !== undefined && value !== null && value !== '') {
          return String(value);
        }
      }
      return '';
    }

    return data.map(function(row) {
      return {
        id: pick(row, ['id', 'ID']),
        question: pick(row, ['question', 'Soal', 'soal']),
        answer: pick(row, ['answer', 'Jawaban', 'jawaban']),
        explanation: pick(row, ['explanation', 'Penjelasan', 'penjelasan'])
      };
    }).filter(function(row) {
      return row.question && row.answer && row.explanation;
    });
  }

  function evaluateRow(row, idx) {
    var qId = (row.question || 'Q89443').toUpperCase();
    var qMeta = questions[qId] || questions.Q89443;
    var ans = row.answer || qMeta.key;
    var text = row.explanation || '';
    var lower = text.toLowerCase();
    var id = row.id || ('RESP-' + (idx + 1));

    var answerStatus = ans === qMeta.key ? 'benar' : 'salah';
    var expClass = '';
    var label = '';
    var score = 0;
    var highlights = [];

    var isCorrectNegativeRule = /mengurangi negatif|negatif sama dengan menambah|minus ketemu minus|minus.*bertemu.*minus|dua minus.*positif|tanda minus.*(jadi|berubah).*plus|negatif.*dikurangi.*negatif/.test(lower);
    var isTacking = qId === 'Q89443' && /tanda negatif|tanda minus|minus di depan|selisih|8 kurang 5|8 dikurangi 5|8 - 5|coret tanda negatif|abaikan tanda kurung|hasilnya negatif|beri tanda negatif|tambah(kan)? minus|karena.*negatif|angkanya negatif/.test(lower);

    if (lower.length < 10 || /tidak tahu|tidak yakin|unsure|guess|saya kira/.test(lower)) {
      expClass = 'tidak-jelas';
      score = 0.4;
    } else if (isCorrectNegativeRule) {
      expClass = 'benar';
      score = 0.92;
      highlights = ['mengurangi negatif', 'menambah positif'];
    } else if (isTacking) {
      expClass = 'miskonsepsi';
      label = 'Tacking';
      score = 0.82;
      highlights = ['tanda negatif', 'selisih', 'minus'];
    } else if (qId === 'Q31778' && /selisih|dikurangi/.test(lower)) {
      expClass = 'miskonsepsi';
      label = 'Additive';
      score = 0.86;
      highlights = ['selisih', 'dikurangi'];
    } else if (/atas dengan atas|bawah dengan bawah|pembilang.*pembilang|penyebut.*penyebut/.test(lower)) {
      expClass = 'miskonsepsi';
      label = 'Adding_across';
      score = 0.88;
      highlights = ['atas', 'bawah'];
    } else if (/samakan penyebut|penyebut.*kali/.test(lower) && /atasnya|pembilang/.test(lower)) {
      expClass = 'miskonsepsi';
      label = 'Denominator-only_change';
      score = 0.84;
      highlights = ['penyebut', 'pembilang'];
    } else if (/minus.*minus.*plus|negatif.*negatif.*positif|dua minus jadi/.test(lower)) {
      expClass = 'miskonsepsi';
      label = 'Subtracting_is_addition';
      score = 0.88;
      highlights = ['minus', 'negatif'];
    } else if (/pecahan.*besar|denominator.*big|penyebut besar/.test(lower)) {
      expClass = 'miskonsepsi';
      label = 'Larger_denominator';
      score = 0.82;
      highlights = ['besar', 'penyebut'];
    } else if (/tacking|jumlah.*penyebut.*pembilang|numerator.*denominator/.test(lower)) {
      expClass = 'miskonsepsi';
      label = 'Tacking';
      score = 0.79;
      highlights = ['jumlah', 'penyebut', 'pembilang'];
    } else if (qId === 'Q31772' && /1\/3|sepertiga/.test(lower)) {
      expClass = 'benar';
      score = 0.91;
      highlights = ['1/3'];
    } else if (/sederhana|simplif|reduce/.test(lower)) {
      expClass = 'benar';
      score = 0.91;
    } else {
      expClass = answerStatus === 'benar' ? 'benar' : 'tidak-jelas';
      score = answerStatus === 'benar' ? 0.75 : 0.45;
    }

    var highlightedText = text;
    highlights.forEach(function(term) {
      var re = new RegExp('(' + term + ')', 'gi');
      highlightedText = highlightedText.replace(re, '<mark>$1</mark>');
    });

    var candidates = [
      { rank: 1, label: (expClass === 'miskonsepsi' ? 'False_Misconception:' + label : answerStatus === 'benar' ? 'True_Correct:NA' : 'False_Neither:NA'), score: score },
      { rank: 2, label: 'True_Correct:NA', score: Math.max(0, score - 0.15) },
      { rank: 3, label: 'False_Neither:NA', score: Math.max(0, score - 0.25) }
    ];

    return {
      id: id,
      question: qId,
      answer: ans,
      answerStatus: answerStatus,
      answerLabel: answerStatus === 'benar' ? 'Benar' : 'Salah',
      text: text,
      explanation: text,
      explanationClass: expClass,
      label: label,
      score: score,
      highlightTerms: highlights,
      highlightedText: highlightedText,
      topCandidates: candidates
    };
  }

  function renderDashboard() {
    var total = activeBatch.length;
    var hidden = activeBatch.filter(function(r) { return r.answerStatus === 'benar' && r.explanationClass === 'miskonsepsi'; }).length;
    var falseCorrect = activeBatch.filter(function(r) { return r.answerStatus === 'salah' && r.explanationClass === 'benar'; }).length;
    var avgConf = activeBatch.reduce(function(sum, r) { return sum + r.score; }, 0) / total;

    kpiTotal.textContent = total;
    kpiHidden.textContent = hidden;
    kpiFalseCorrect.textContent = falseCorrect;
    kpiAvgConf.textContent = avgConf.toFixed(2);

    // Chart 1: 3 classes
    var misCnt = activeBatch.filter(function(r) { return r.explanationClass === 'miskonsepsi'; }).length;
    var benarCnt = activeBatch.filter(function(r) { return r.explanationClass === 'benar'; }).length;
    var tidakCnt = activeBatch.filter(function(r) { return r.explanationClass === 'tidak-jelas'; }).length;

    var classHtml = '';
    classHtml += renderBar('Miskonsepsi', misCnt, total, 'red');
    classHtml += renderBar('Benar', benarCnt, total, 'teal');
    classHtml += renderBar('Tidak Jelas', tidakCnt, total, 'amber');
    chartClasses.innerHTML = classHtml;

    // Chart 2: labels
    var labelCounts = {};
    activeBatch.forEach(function(r) {
      if (r.label) {
        labelCounts[r.label] = (labelCounts[r.label] || 0) + 1;
      }
    });
    var labelHtml = '';
    Object.keys(labelCounts).forEach(function(lbl) {
      labelHtml += renderBar(lbl, labelCounts[lbl], total, 'ink');
    });
    chartLabels.innerHTML = labelHtml || '<p style="color:#5b5a54;">Tidak ada label spesifik terdeteksi.</p>';
  }

  function renderBar(label, count, total, color) {
    var pct = Math.round((count / total) * 100);
    var html = '<div class="bar">';
    html += '<div class="bar-label"><span>' + label + '</span><span>' + count + ' (' + pct + '%)</span></div>';
    html += '<div class="bar-track"><div class="bar-fill ' + color + '" style="width:' + pct + '%"></div></div>';
    html += '</div>';
    return html;
  }

  function renderQueue() {
    queueCount.textContent = '(' + activeBatch.length + ' baris)';
    queueList.innerHTML = '';
    activeBatch.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'queue-item';
      div.textContent = item.id + ' · ' + item.question + ' · ' + item.answer + ' · ' + item.explanationClass;
      div.addEventListener('click', function() {
        document.querySelectorAll('.queue-item').forEach(function(el) { el.classList.remove('active'); });
        div.classList.add('active');
        renderInspector(item);
      });
      queueList.appendChild(div);
    });
  }

  function renderInspector(item) {
    dxMeta.textContent = 'HASIL EVALUASI · ' + item.id + ' · ' + item.question + ' · OPSI: ' + item.answer;

    var isHidden = item.answerStatus === 'benar' && item.explanationClass === 'miskonsepsi';
    var isFalseCorrect = item.answerStatus === 'salah' && item.explanationClass === 'benar';

    if (isHidden) {
      dxTitle.textContent = 'Jawaban benar, tetapi penalaran mengandung miskonsepsi (' + item.label + ')';
    } else if (isFalseCorrect) {
      dxTitle.textContent = 'Jawaban salah, tetapi penalaran konsep sudah benar';
    } else if (item.explanationClass === 'miskonsepsi') {
      dxTitle.textContent = 'Miskonsepsi terdeteksi: ' + (item.label || 'Perlu tinjauan');
    } else if (item.explanationClass === 'benar') {
      dxTitle.textContent = 'Paham utuh: jawaban dan penalaran selaras';
    } else {
      dxTitle.textContent = 'Penjelasan belum cukup jelas';
    }

    dxCompare.style.display = 'grid';
    dxAutograder.textContent = item.answerLabel + ' — ' + (item.answerStatus === 'benar' ? 'Lolos tanpa tinjauan' : 'Salah');
    dxDiamis.textContent = (isHidden || item.explanationClass === 'miskonsepsi') ? 'Masuk Antrean Guru' : item.answerStatus === 'benar' ? 'Lolos' : 'Salah';

    dxEvidence.style.display = 'block';
    dxQuote.innerHTML = item.highlightedText;
    dxRationale.textContent = 'Frasa pemicu: ' + (item.highlightTerms.length > 0 ? item.highlightTerms.join(', ') : 'tidak ada');

    dxConf.style.display = 'block';
    var confHtml = '';
    item.topCandidates.forEach(function(cand) {
      var pct = Math.round(cand.score * 100);
      var colorClass = cand.rank === 1 ? (cand.label.includes('Misconception') ? 'red' : cand.label.includes('Correct') ? 'teal' : 'amber') : '';
      confHtml += renderBar('#' + cand.rank + ' ' + cand.label, pct, 100, colorClass);
    });
    dxConfBars.innerHTML = confHtml;
  }

  // Auto-load sample on page load for demo
  if (btnLoadSample) {
    btnLoadSample.click();
  }
})();
