(function () {
  "use strict";

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function formatScore(value) {
    return Number(value).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  var toastTimer = null;

  function showToast(message) {
    var toast = $("#toast");
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 4200);
  }

  function initHeader() {
    var header = $(".site-header");
    var button = $(".menu-button");
    if (!header || !button) {
      return;
    }

    function setMenu(open) {
      header.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Tutup" : "Menu";
    }

    button.addEventListener("click", function () {
      setMenu(!header.classList.contains("is-open"));
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("is-open")) {
        setMenu(false);
        button.focus();
      }
    });

    $$(".nav a", header).forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });

    var desktop = window.matchMedia("(min-width: 901px)");
    if (desktop.addEventListener) {
      desktop.addEventListener("change", function (event) {
        if (event.matches) {
          setMenu(false);
        }
      });
    }
  }

  function initCase() {
    var body = document.body;
    var caseKey = body.getAttribute("data-case-key");
    var modelLabel = body.getAttribute("data-model-label") || "";
    var modeButtons = $$("[data-mode]");
    var panels = $$("[data-panel]");
    var bannerTexts = $$("[data-banner]");
    var reviewSection = $("[data-review-section]");
    var modeAnnounce = $("#mode-announce");
    var reviewStatus = $("#review-status");
    var reviewStateTag = $("[data-review-state]");
    var storageKey = "diamis.review." + caseKey;
    var currentReview = null;

    try {
      var stored = storageGet(storageKey);
      if (stored) {
        currentReview = JSON.parse(stored);
      }
    } catch (error) {
      currentReview = null;
    }

    function setMode(mode, announce) {
      modeButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.getAttribute("data-mode") === mode));
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-panel") !== mode;
      });
      bannerTexts.forEach(function (text) {
        text.hidden = text.getAttribute("data-banner") !== mode;
      });
      if (reviewSection) {
        reviewSection.hidden = mode === "autograder";
      }
      if (announce && modeAnnounce) {
        modeAnnounce.textContent = mode === "autograder"
          ? "Mode auto-grader aktif. Hanya jawaban akhir yang diperiksa."
          : "Mode DIAMIS aktif. Diagnosis dan tinjauan guru ditampilkan.";
      }
    }

    modeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setMode(button.getAttribute("data-mode"), true);
      });
    });
    setMode("diamis", false);

    function reviewText(review) {
      if (!review) {
        return "Belum ada keputusan. Pilih salah satu tindakan di atas.";
      }
      if (review.decision === "setuju") {
        return "Keputusan: setuju dengan bacaan model. Tersimpan di perangkat ini.";
      }
      if (review.decision === "ganti") {
        return "Keputusan: label diubah menjadi " + review.label + ". Tersimpan di perangkat ini.";
      }
      if (review.decision === "tidak-jelas") {
        return "Keputusan: ditandai tidak jelas. Tersimpan di perangkat ini.";
      }
      if (review.decision === "konteks") {
        return "Keputusan: butuh konteks. Tersimpan di perangkat ini.";
      }
      return "Keputusan tersimpan di perangkat ini.";
    }

    function renderReview() {
      if (reviewStatus) {
        reviewStatus.textContent = reviewText(currentReview);
      }
      if (reviewStateTag) {
        reviewStateTag.textContent = currentReview ? "Sudah ditinjau" : "Belum ditinjau";
        reviewStateTag.className = currentReview ? "tag tag--teal" : "tag tag--muted";
      }
    }

    function saveReview(decision, label) {
      currentReview = {
        decision: decision,
        label: label,
        timestamp: new Date().toISOString()
      };
      var saved = storageSet(storageKey, JSON.stringify(currentReview));
      renderReview();
      showToast(saved
        ? "Keputusan tersimpan di perangkat ini. Mode demo tidak mengirim data."
        : "Keputusan ditampilkan, tetapi browser ini tidak mengizinkan penyimpanan lokal.");
    }

    var agree = $('[data-review="setuju"]');
    if (agree) {
      agree.addEventListener("click", function () {
        saveReview("setuju", modelLabel);
      });
    }

    var unclear = $('[data-review="tidak-jelas"]');
    if (unclear) {
      unclear.addEventListener("click", function () {
        saveReview("tidak-jelas", modelLabel);
      });
    }

    var context = $('[data-review="konteks"]');
    if (context) {
      context.addEventListener("click", function () {
        saveReview("konteks", modelLabel);
      });
    }

    var labelDialog = $("#label-dialog");
    var labelTrigger = null;
    var labelSearch = $("#label-search");
    var labelOptions = $$(".label-option");
    var labelEmpty = $("#label-empty");

    function filterLabels() {
      if (!labelSearch) {
        return;
      }
      var query = labelSearch.value.trim().toLowerCase();
      var visible = 0;
      labelOptions.forEach(function (option) {
        var matches = option.getAttribute("data-label").toLowerCase().indexOf(query) !== -1;
        option.hidden = !matches;
        if (matches) {
          visible += 1;
        }
      });
      if (labelEmpty) {
        labelEmpty.hidden = visible !== 0;
      }
    }

    var changeLabel = $('[data-review="ganti"]');
    if (changeLabel && labelDialog) {
      changeLabel.addEventListener("click", function () {
        labelTrigger = changeLabel;
        if (labelSearch) {
          labelSearch.value = "";
        }
        filterLabels();
        if (typeof labelDialog.showModal === "function") {
          labelDialog.showModal();
        } else {
          labelDialog.setAttribute("open", "");
        }
        window.setTimeout(function () {
          if (labelSearch) {
            labelSearch.focus();
          }
        }, 30);
      });
    }

    if (labelSearch) {
      labelSearch.addEventListener("input", filterLabels);
    }

    labelOptions.forEach(function (option) {
      option.addEventListener("click", function () {
        var label = option.getAttribute("data-label");
        saveReview("ganti", label);
        if (labelDialog) {
          labelDialog.close();
        }
      });
    });

    $$("[data-close-dialog]").forEach(function (button) {
      button.addEventListener("click", function () {
        var dialog = button.closest("dialog");
        if (dialog) {
          dialog.close();
        }
      });
    });

    if (labelDialog) {
      labelDialog.addEventListener("close", function () {
        if (labelTrigger) {
          labelTrigger.focus();
        }
      });
    }

    var resetDialog = $("#reset-dialog");
    var resetTrigger = $("[data-review-reset]");
    var confirmReset = $("[data-confirm-reset]");

    if (resetTrigger && resetDialog) {
      resetTrigger.addEventListener("click", function () {
        if (typeof resetDialog.showModal === "function") {
          resetDialog.showModal();
        } else {
          resetDialog.setAttribute("open", "");
        }
      });
    }

    if (confirmReset) {
      confirmReset.addEventListener("click", function () {
        storageRemove(storageKey);
        currentReview = null;
        renderReview();
        if (resetDialog) {
          resetDialog.close();
        }
        showToast("Keputusan tinjauan dihapus dari perangkat ini.");
      });
    }

    if (resetDialog) {
      resetDialog.addEventListener("close", function () {
        if (resetTrigger) {
          resetTrigger.focus();
        }
      });
    }

    renderReview();
  }

  function initData() {
    var form = $("#filter-form");
    var tbody = $("#ledger-body");
    var cardList = $("#card-list");
    var tableWrap = $("#table-wrap");
    var loading = $("#data-loading");
    var errorState = $("#data-error");
    var emptyState = $("#data-empty");
    var pagination = $("#pagination");
    var summary = $("#result-summary");
    var pageStatus = $("#page-status");
    var prev = $("#page-prev");
    var next = $("#page-next");
    var exportButton = $("#export-csv");
    var rowDialog = $("#row-dialog");
    var rowDialogTitle = $("#row-dialog-title");
    var rowDialogMeta = $("#row-dialog-meta");
    var rowDialogQuote = $("#row-dialog-quote");
    var rowDialogEvidence = $("#row-dialog-evidence");
    var rowDialogLink = $("#row-dialog-link");
    var rowTrigger = null;
    var rows = [];
    var state = { page: 1, pageSize: 10 };

    if (!form || !tbody || !cardList || !tableWrap) {
      return;
    }

    function readParams() {
      var params = new URLSearchParams(window.location.search);
      var map = {
        soal: "filter-question",
        jawaban: "filter-answer",
        penjelasan: "filter-explanation",
        label: "filter-label",
        prioritas: "filter-priority"
      };
      Object.keys(map).forEach(function (key) {
        if (!params.has(key)) {
          return;
        }
        var field = document.getElementById(map[key]);
        if (!field) {
          return;
        }
        var value = params.get(key);
        if (field.tagName === "SELECT") {
          var exists = Array.prototype.some.call(field.options, function (option) {
            return option.value === value;
          });
          if (exists) {
            field.value = value;
          }
        } else {
          field.value = value;
        }
      });
    }

    function filteredRows() {
      var question = $("#filter-question").value;
      var answer = $("#filter-answer").value;
      var explanation = $("#filter-explanation").value;
      var label = $("#filter-label").value.trim().toLowerCase();
      var priority = $("#filter-priority").value;

      return rows.filter(function (row) {
        if (question && row.question !== question) {
          return false;
        }
        if (answer && row.answerStatus !== answer) {
          return false;
        }
        if (explanation && row.explanationClass !== explanation) {
          return false;
        }
        if (label && row.label.toLowerCase().indexOf(label) === -1) {
          return false;
        }
        if (priority && row.priorityKey !== priority) {
          return false;
        }
        return true;
      });
    }

    function realPatternNote() {
      var question = $("#filter-question").value;
      var answer = $("#filter-answer").value;
      var explanation = $("#filter-explanation").value;
      var label = $("#filter-label").value.trim().toLowerCase();
      var priority = $("#filter-priority").value;

      if (question === "Q89443" && answer === "benar" && explanation === "miskonsepsi" && label === "tacking" && !priority) {
        return "Pola ini muncul pada 162 respons di Q89443 pada data MIME penuh.";
      }
      if (question === "Q89443" && answer === "benar" && explanation === "miskonsepsi" && !label && !priority) {
        return "Pola ini muncul pada 164 respons di Q89443 pada data MIME penuh.";
      }
      if (question === "Q31772" && answer === "salah" && explanation === "benar" && !label && !priority) {
        return "Pola ini muncul pada 31 respons di Q31772 pada data MIME penuh.";
      }
      if (!question && answer === "benar" && explanation === "miskonsepsi" && !label && !priority) {
        return "Pola ini muncul pada 403 respons di data MIME penuh.";
      }
      if (!question && answer === "salah" && explanation === "benar" && !label && !priority) {
        return "Pola ini muncul pada 227 respons di data MIME penuh.";
      }
      return "Angka matriks berasal dari 36.696 respons di data MIME penuh, bukan dari 16 baris sintetis ini.";
    }

    function priorityTag(row) {
      var span = document.createElement("span");
      span.className = row.priorityKey === "tinggi"
        ? "tag tag--red"
        : row.priorityKey === "sedang"
          ? "tag tag--amber"
          : "tag tag--muted";
      span.textContent = row.priority;
      return span;
    }

    function buildCell(text, className) {
      var cell = document.createElement("td");
      if (className) {
        cell.className = className;
      }
      cell.textContent = text;
      return cell;
    }

    function renderTable(visibleRows) {
      tbody.textContent = "";
      visibleRows.forEach(function (row) {
        var tr = document.createElement("tr");

        var idCell = buildCell(row.id, "ledger__id");
        tr.appendChild(idCell);
        tr.appendChild(buildCell(row.question));

        var answerCell = document.createElement("td");
        answerCell.textContent = row.answer;
        tr.appendChild(answerCell);

        var explanationCell = document.createElement("td");
        var clamp = document.createElement("span");
        clamp.className = "clamp";
        clamp.textContent = row.explanation;
        explanationCell.appendChild(clamp);
        tr.appendChild(explanationCell);

        var labelCell = document.createElement("td");
        if (row.label) {
          labelCell.textContent = row.label;
        } else {
          labelCell.textContent = "Tidak ada";
          labelCell.className = "text-muted";
        }
        tr.appendChild(labelCell);

        tr.appendChild(buildCell(formatScore(row.score), "ledger__score"));

        var priorityCell = document.createElement("td");
        priorityCell.className = "ledger__priority";
        priorityCell.appendChild(priorityTag(row));
        tr.appendChild(priorityCell);

        var actionCell = document.createElement("td");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn--small";
        button.textContent = "Tinjau";
        button.setAttribute("data-row-id", row.id);
        button.setAttribute("aria-label", "Tinjau " + row.id + ", soal " + row.question);
        actionCell.appendChild(button);
        tr.appendChild(actionCell);

        tbody.appendChild(tr);
      });
    }

    function renderCards(visibleRows) {
      cardList.textContent = "";
      visibleRows.forEach(function (row) {
        var li = document.createElement("li");
        li.className = "data-card";

        var head = document.createElement("div");
        head.className = "data-card__head";
        var id = document.createElement("span");
        id.className = "data-card__id";
        id.textContent = row.id + " · " + row.question;
        head.appendChild(id);
        head.appendChild(priorityTag(row));
        li.appendChild(head);

        var fields = document.createElement("dl");
        fields.className = "data-card__fields";
        [
          ["Jawaban", row.answer],
          ["Penjelasan", row.explanationLabel],
          ["Label", row.label || "Tidak ada"],
          ["Skor ilustratif", formatScore(row.score)]
        ].forEach(function (pair) {
          var dt = document.createElement("dt");
          dt.textContent = pair[0];
          var dd = document.createElement("dd");
          dd.textContent = pair[1];
          fields.appendChild(dt);
          fields.appendChild(dd);
        });
        li.appendChild(fields);

        var button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn--small";
        button.textContent = "Tinjau";
        button.setAttribute("data-row-id", row.id);
        button.setAttribute("aria-label", "Tinjau " + row.id + ", soal " + row.question);
        li.appendChild(button);

        cardList.appendChild(li);
      });
    }

    function updateMiniMatrix() {
      var answer = $("#filter-answer").value;
      var explanation = $("#filter-explanation").value;
      $$(".mini-cell").forEach(function (button) {
        var active = button.getAttribute("data-answer") === answer &&
          button.getAttribute("data-explanation") === explanation &&
          answer !== "" && explanation !== "";
        button.setAttribute("aria-pressed", String(active));
      });
    }

    function render() {
      var filtered = filteredRows();
      var total = filtered.length;
      var pages = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.page > pages) {
        state.page = pages;
      }
      if (state.page < 1) {
        state.page = 1;
      }
      var start = (state.page - 1) * state.pageSize;
      var visible = filtered.slice(start, start + state.pageSize);

      tableWrap.hidden = total === 0;
      pagination.hidden = total === 0;
      emptyState.hidden = total !== 0;
      exportButton.disabled = total === 0;

      if (total === 0) {
        summary.textContent = "Tidak ada contoh sintetis yang cocok dengan filter ini.";
      } else {
        summary.textContent = "Menampilkan " + (start + 1) + " sampai " + (start + visible.length) +
          " dari " + total + " contoh sintetis. " + realPatternNote();
      }

      if (total > 0) {
        renderTable(visible);
        renderCards(visible);
        pageStatus.textContent = "Halaman " + state.page + " dari " + pages;
        prev.disabled = state.page <= 1;
        next.disabled = state.page >= pages;
      }

      updateMiniMatrix();
    }

    function applyFilters() {
      state.page = 1;
      render();
    }

    function openRowDialog(row, trigger) {
      if (!rowDialog) {
        return;
      }
      rowTrigger = trigger;
      rowDialogTitle.textContent = row.id + ": " + row.question;
      rowDialogMeta.textContent = "";
      [
        ["Jawaban", row.answer + " (" + row.answerLabel + ")"],
        ["Kelas penjelasan", row.explanationLabel],
        ["Label", row.label || "Tidak ada"],
        ["Skor ilustratif", formatScore(row.score) + " (belum dikalibrasi)"],
        ["Prioritas", row.priority]
      ].forEach(function (pair) {
        var dt = document.createElement("dt");
        dt.textContent = pair[0];
        var dd = document.createElement("dd");
        dd.textContent = pair[1];
        rowDialogMeta.appendChild(dt);
        rowDialogMeta.appendChild(dd);
      });
      rowDialogQuote.textContent = row.explanation;
      rowDialogEvidence.textContent = row.evidence;
      if (row.caseUrl) {
        rowDialogLink.href = row.caseUrl;
        rowDialogLink.hidden = false;
      } else {
        rowDialogLink.hidden = true;
      }
      if (typeof rowDialog.showModal === "function") {
        rowDialog.showModal();
      } else {
        rowDialog.setAttribute("open", "");
      }
      window.setTimeout(function () {
        rowDialogTitle.focus();
      }, 30);
    }

    function closeRowDialog() {
      if (rowDialog) {
        rowDialog.close();
      }
    }

    function handleRowClick(event) {
      var button = event.target.closest("[data-row-id]");
      if (!button) {
        return;
      }
      var row = rows.filter(function (item) {
        return item.id === button.getAttribute("data-row-id");
      })[0];
      if (row) {
        openRowDialog(row, button);
      }
    }

    tbody.addEventListener("click", handleRowClick);
    cardList.addEventListener("click", handleRowClick);

    if (rowDialog) {
      rowDialog.addEventListener("close", function () {
        if (rowTrigger) {
          rowTrigger.focus();
        }
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });
    form.addEventListener("change", applyFilters);
    $("#filter-label").addEventListener("input", applyFilters);

    $$("[data-reset-filters]").forEach(function (button) {
      button.addEventListener("click", function () {
        form.reset();
        applyFilters();
        $("#filter-question").focus();
      });
    });

    $$(".mini-cell").forEach(function (button) {
      button.addEventListener("click", function () {
        $("#filter-question").value = "";
        $("#filter-answer").value = button.getAttribute("data-answer") || "";
        $("#filter-explanation").value = button.getAttribute("data-explanation") || "";
        $("#filter-label").value = "";
        $("#filter-priority").value = "";
        applyFilters();
        var target = $("#hasil");
        if (target) {
          var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        }
      });
    });

    prev.addEventListener("click", function () {
      if (state.page > 1) {
        state.page -= 1;
        render();
      }
    });

    next.addEventListener("click", function () {
      var pages = Math.max(1, Math.ceil(filteredRows().length / state.pageSize));
      if (state.page < pages) {
        state.page += 1;
        render();
      }
    });

    function csvCell(value) {
      var text = String(value == null ? "" : value);
      return '"' + text.replace(/"/g, '""') + '"';
    }

    exportButton.addEventListener("click", function () {
      var filtered = filteredRows();
      if (filtered.length === 0) {
        return;
      }
      var lines = [
        ["ID", "Soal", "Jawaban", "Kelas penjelasan", "Label", "Skor ilustratif", "Prioritas", "Penjelasan"]
      ];
      filtered.forEach(function (row) {
        lines.push([
          row.id,
          row.question,
          row.answer,
          row.explanationLabel,
          row.label || "Tidak ada",
          formatScore(row.score),
          row.priority,
          row.explanation
        ]);
      });
      var csv = lines.map(function (line) {
        return line.map(csvCell).join(",");
      }).join("\r\n");
      var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "diamis-contoh-sintetis.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
      showToast("CSV contoh diunduh. Isinya hanya data sintetis.");
    });

    function load() {
      try {
        if (!window.DIAMIS_DEMO || !Array.isArray(window.DIAMIS_DEMO.rows)) {
          throw new Error("Data demo tidak tersedia.");
        }
        rows = window.DIAMIS_DEMO.rows;
        readParams();
        window.setTimeout(function () {
          if (loading) {
            loading.hidden = true;
          }
          render();
        }, 250);
      } catch (error) {
        if (loading) {
          loading.hidden = true;
        }
        if (errorState) {
          errorState.hidden = false;
        }
        tableWrap.hidden = true;
        if (pagination) {
          pagination.hidden = true;
        }
      }
    }

    var reload = $("#data-reload");
    if (reload) {
      reload.addEventListener("click", function () {
        window.location.reload();
      });
    }

    load();
  }

  function initSimulate() {
    var demo = window.DIAMIS_DEMO || {};
    var questions = demo.questions || {};
    var labelDefs = demo.labelDefinitions || {};
    var baseRows = (demo.rows || []).concat(demo.extraBatchRows || []);

    var btnLoadSample = $("#btn-load-sample");
    var btnDownloadSample = $("#btn-download-sample");
    var fileInput = $("#file-input");
    var uploadStatus = $("#upload-status");

    var dashboard = $("#dashboard");
    var inspectorSection = $("#inspector-section");

    var kpiTotal = $("#kpi-total");
    var kpiHidden = $("#kpi-hidden");
    var kpiFalseCorrect = $("#kpi-false-correct");
    var kpiAvgConf = $("#kpi-avg-conf");

    var chartClasses = $("#chart-classes");
    var chartLabels = $("#chart-labels");

    var queueCount = $("#queue-count");
    var queueList = $("#batch-queue");

    var testForm = $("#live-test-form");
    var selQuestion = $("#test-question");
    var selAnswer = $("#test-answer");
    var txtExplanation = $("#test-explanation");

    var dxMeta = $("#dx-meta");
    var dxTitle = $("#dx-title");
    var dxCompare = $("#dx-compare");
    var dxAutograder = $("#dx-autograder");
    var dxDiamis = $("#dx-diamis");
    var dxEvidence = $("#dx-evidence");
    var dxQuote = $("#dx-quote");
    var dxRationale = $("#dx-rationale");
    var dxConf = $("#dx-conf");
    var dxConfBars = $("#dx-conf-bars");

    var activeBatch = [];
    var selectedRowId = null;

    function normalizeQuestionId(raw) {
      var str = String(raw || "Q89443").trim().toUpperCase();
      if (str.indexOf("Q") !== 0 && /^\d+$/.test(str)) {
        str = "Q" + str;
      }
      return questions[str] ? str : "Q89443";
    }

    function evaluateResponse(rawRow, index) {
      var qId = normalizeQuestionId(rawRow.question || rawRow.Soal || rawRow.QuestionId || "Q89443");
      var qMeta = questions[qId] || questions.Q89443;
      var ans = String(rawRow.answer != null ? rawRow.answer : (rawRow.Jawaban != null ? rawRow.Jawaban : qMeta.key)).trim();
      var text = String(rawRow.explanation || rawRow.Penjelasan || rawRow.StudentExplanation || "").trim();
      var lower = text.toLowerCase();
      var id = rawRow.id || rawRow.ID || rawRow.row_id || ("UJI-" + String(index + 1).padStart(3, "0"));

      var answerStatus = rawRow.answerStatus || (ans === qMeta.key ? "benar" : "salah");
      var answerLabel = answerStatus === "benar" ? "Benar" : "Salah";

      var expClass = rawRow.explanationClass || "";
      var detectedLabel = rawRow.label || "";
      var mainScore = Number(rawRow.score) || 0;
      var highlightTerms = [];

      var wordCount = text ? text.split(/\s+/).length : 0;

      if (!expClass) {
        if (wordCount < 3 || /tidak yakin|kira|tebak|entah|tidak tahu|unsure|guess/.test(lower)) {
          expClass = "tidak-jelas";
          mainScore = 0.44;
          highlightTerms = ["tidak yakin", "kira", "tebak", "tidak tahu"];
        } else if (qId === "Q89443") {
          if (/tambah\s+positif|menambah\s+positif|-8\s*\+\s*5|mengurangi\s+negatif|minus\s+ketemu\s+minus\s+jadi\s+tambah\s+5/.test(lower)) {
            expClass = "benar";
            mainScore = 0.94;
            highlightTerms = ["-8 + 5", "mengurangi negatif", "menambah positif", "tambah positif"];
          } else if (/8\s*\+\s*5|jadi\s+positif\s+semua|13|dua\s+tanda\s+negatif\s+berubah/.test(lower)) {
            expClass = "miskonsepsi";
            detectedLabel = "Positive";
            mainScore = 0.85;
            highlightTerms = ["positif semua", "8 ditambah 5", "8 + 5", "13"];
          } else {
            expClass = "miskonsepsi";
            detectedLabel = "Tacking";
            mainScore = 0.87;
            highlightTerms = ["8 dikurangi 5", "8 - 5", "8 kurang 5", "tanda negatif", "tambahkan minus", "beri tanda minus", "selisihnya 3"];
          }
        } else if (qId === "Q31772") {
          if (/1\/3|sepertiga|paling\s+sederhana|dibagi\s+3|disederhanakan/.test(lower)) {
            expClass = "benar";
            mainScore = 0.91;
            highlightTerms = ["3 dari 9", "1/3", "sepertiga", "disederhanakan", "dibagi 3"];
          } else if (/3\/6|enam\s+bagian|hitam/.test(lower)) {
            expClass = "miskonsepsi";
            detectedLabel = "Wrong_Fraction";
            mainScore = 0.86;
            highlightTerms = ["6 bagian", "3/6", "diarsir"];
          } else {
            expClass = "miskonsepsi";
            detectedLabel = "Incomplete";
            mainScore = 0.82;
            highlightTerms = ["3/9", "3 dari 9"];
          }
        } else if (qId === "Q31778") {
          if (/dibagi\s+3|3\/5|dikali\s+2|6\/10|proporsi|senilai/.test(lower)) {
            expClass = "benar";
            mainScore = 0.92;
            highlightTerms = ["dibagi 3", "3/5", "dikali 2", "6/10"];
          } else {
            expClass = "miskonsepsi";
            detectedLabel = "Additive";
            mainScore = 0.90;
            highlightTerms = ["dikurangi", "selisihnya", "15 dikurangi 9", "15 dikurangi 10", "9 dikurangi 5"];
          }
        } else if (qId === "Q33472") {
          if (/5\/15|6\/15|11\/15/.test(lower)) {
            expClass = "benar";
            mainScore = 0.94;
            highlightTerms = ["5/15", "6/15", "11/15", "penyebut ke 15"];
          } else if (/15|3\s*kali\s*5|3\s*dikali\s*5/.test(lower) && /3\/15|1\s*\+\s*2|1\s*tambah\s*2|1\s*ditambah\s*2/.test(lower)) {
            expClass = "miskonsepsi";
            detectedLabel = "Denominator-only_change";
            mainScore = 0.88;
            highlightTerms = ["jadi 15", "1 ditambah 2", "1 tambah 2", "3/15"];
          } else {
            expClass = "miskonsepsi";
            detectedLabel = "Adding_across";
            mainScore = 0.93;
            highlightTerms = ["atas dengan atas", "bawah dengan bawah", "1 + 2 = 3", "3 + 5 = 8", "3/8"];
          }
        }
      } else {
        if (!mainScore) {
          mainScore = expClass === "benar" ? 0.91 : expClass === "miskonsepsi" ? 0.85 : 0.42;
        }
        if (qId === "Q89443") {
          highlightTerms = ["8 dikurangi 5", "8 - 5", "8 kurang 5", "tanda negatif", "tanda minus", "minus", "-8 + 5", "mengurangi negatif"];
        } else if (qId === "Q31772") {
          highlightTerms = ["3 dari 9", "3 bagian", "1/3", "sepertiga", "3/9", "3/6", "3/8"];
        } else if (qId === "Q31778") {
          highlightTerms = ["15 dikurangi 9", "15 dikurangi 10", "selisihnya 6", "9 dikurangi 5"];
        } else if (qId === "Q33472") {
          highlightTerms = ["1 + 2 = 3", "3 + 5 = 8", "atas dengan atas", "jadi 15", "3/15"];
        }
      }

      if (expClass === "miskonsepsi" && !detectedLabel) {
        detectedLabel = qMeta.labelSpace[0] || "Tacking";
      }
      if (expClass !== "miskonsepsi") {
        detectedLabel = "";
      }

      var expLabel = expClass === "benar"
        ? "Benar"
        : expClass === "miskonsepsi"
          ? "Miskonsepsi"
          : "Tidak jelas";

      var isHidden = answerStatus === "benar" && expClass === "miskonsepsi";
      var isFalseCorrect = answerStatus === "salah" && expClass === "benar";
      var priorityKey = (isHidden || isFalseCorrect)
        ? "tinggi"
        : (expClass === "miskonsepsi" || expClass === "tidak-jelas")
          ? "sedang"
          : "rendah";
      var priority = priorityKey === "tinggi" ? "Tinggi" : priorityKey === "sedang" ? "Sedang" : "Rendah";

      var detScores = { miskonsepsi: 0.05, benar: 0.05, tidakJelas: 0.05 };
      var remainder = Math.max(0.04, +(1 - mainScore).toFixed(2));
      if (expClass === "miskonsepsi") {
        detScores.miskonsepsi = mainScore;
        detScores.tidakJelas = +(remainder * 0.62).toFixed(2);
        detScores.benar = +(1 - detScores.miskonsepsi - detScores.tidakJelas).toFixed(2);
      } else if (expClass === "benar") {
        detScores.benar = mainScore;
        detScores.tidakJelas = +(remainder * 0.55).toFixed(2);
        detScores.miskonsepsi = +(1 - detScores.benar - detScores.tidakJelas).toFixed(2);
      } else {
        var topUnclear = Math.max(0.54, mainScore);
        detScores.tidakJelas = topUnclear;
        detScores.miskonsepsi = +((1 - topUnclear) * 0.6).toFixed(2);
        detScores.benar = +(1 - detScores.tidakJelas - detScores.miskonsepsi).toFixed(2);
      }

      var space = qMeta.labelSpace.slice(0, 3);
      var candidates = [];
      if (expClass === "miskonsepsi") {
        var primary = detectedLabel || space[0];
        var others = space.filter(function (l) { return l !== primary; });
        var c1 = mainScore;
        var c2 = +(Math.max(0.03, (1 - c1) * 0.68)).toFixed(2);
        var c3 = +(Math.max(0.01, 1 - c1 - c2)).toFixed(2);
        candidates.push({ label: primary, score: c1 });
        if (others[0]) {
          candidates.push({ label: others[0], score: c2 });
        }
        if (others[1]) {
          candidates.push({ label: others[1], score: c3 });
        }
      } else {
        space.forEach(function (lbl, idx) {
          var s = idx === 0 ? 0.12 : idx === 1 ? 0.05 : 0.02;
          candidates.push({ label: lbl, score: s });
        });
      }

      return {
        id: id,
        question: qId,
        answer: ans,
        answerStatus: answerStatus,
        answerLabel: answerLabel,
        explanationClass: expClass,
        explanationLabel: expLabel,
        label: detectedLabel,
        score: mainScore,
        priority: priority,
        priorityKey: priorityKey,
        explanation: text || "(Tidak ada penjelasan tertulis)",
        highlightTerms: highlightTerms,
        detectorScores: detScores,
        candidates: candidates
      };
    }

    function createBarRow(label, rightText, pct, fillClass) {
      var row = document.createElement("div");
      row.className = "sim-bar-row";

      var head = document.createElement("div");
      head.className = "sim-bar-head";
      var title = document.createElement("span");
      title.className = "sim-bar-title";
      title.textContent = label;
      var meta = document.createElement("strong");
      meta.className = "sim-bar-meta num";
      meta.textContent = rightText;
      head.appendChild(title);
      head.appendChild(meta);

      var track = document.createElement("div");
      track.className = "sim-bar-track";
      var fill = document.createElement("span");
      fill.className = "sim-bar-fill " + fillClass;
      fill.style.width = Math.max(3, Math.min(100, pct)) + "%";
      track.appendChild(fill);

      row.appendChild(head);
      row.appendChild(track);
      return row;
    }

    function renderBatchSummary() {
      var total = activeBatch.length;
      var hiddenCount = 0;
      var falseCorrectCount = 0;
      var sumConf = 0;
      var classCounts = { miskonsepsi: 0, benar: 0, "tidak-jelas": 0 };
      var labelStats = {};

      activeBatch.forEach(function (item) {
        if (item.answerStatus === "benar" && item.explanationClass === "miskonsepsi") {
          hiddenCount += 1;
        }
        if (item.answerStatus === "salah" && item.explanationClass === "benar") {
          falseCorrectCount += 1;
        }
        sumConf += item.score;
        classCounts[item.explanationClass] = (classCounts[item.explanationClass] || 0) + 1;
        if (item.label) {
          if (!labelStats[item.label]) {
            labelStats[item.label] = { count: 0, scoreSum: 0 };
          }
          labelStats[item.label].count += 1;
          labelStats[item.label].scoreSum += item.score;
        }
      });

      var avgConf = total > 0 ? sumConf / total : 0;
      if (kpiTotal) {
        kpiTotal.textContent = String(total);
      }
      if (kpiTotalSub) {
        var highCount = activeBatch.filter(function (r) { return r.priorityKey === "tinggi"; }).length;
        kpiTotalSub.textContent = highCount + " respons masuk prioritas tinggi";
      }
      if (kpiHidden) {
        kpiHidden.textContent = String(hiddenCount);
      }
      if (kpiFalseCorrect) {
        kpiFalseCorrect.textContent = String(falseCorrectCount);
      }
      if (kpiAvgConf) {
        kpiAvgConf.textContent = formatScore(avgConf);
      }

      if (chartClasses) {
        chartClasses.textContent = "";
        var items = [
          { key: "miskonsepsi", name: "Penjelasan Miskonsepsi", count: classCounts.miskonsepsi || 0, cls: "sim-bar-fill--red" },
          { key: "benar", name: "Penjelasan Benar (Utuh)", count: classCounts.benar || 0, cls: "sim-bar-fill--teal" },
          { key: "tidak-jelas", name: "Penjelasan Tidak Jelas", count: classCounts["tidak-jelas"] || 0, cls: "sim-bar-fill--amber" }
        ];
        items.forEach(function (it) {
          var pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
          chartClasses.appendChild(
            createBarRow(it.name, it.count + " respons (" + pct + "%)", pct, it.cls)
          );
        });
      }

      if (chartClassNote) {
        chartClassNote.textContent = "Dari " + (classCounts.miskonsepsi || 0) +
          " respons miskonsepsi, " + hiddenCount +
          " di antaranya berjawaban akhir benar sehingga luput dari auto-grader biasa.";
      }

      if (chartLabels) {
        chartLabels.textContent = "";
        var labelKeys = Object.keys(labelStats).sort(function (a, b) {
          return labelStats[b].count - labelStats[a].count;
        });
        if (labelKeys.length === 0) {
          var empty = document.createElement("p");
          empty.className = "text-muted";
          empty.textContent = "Tidak ada label miskonsepsi pada batch ini.";
          chartLabels.appendChild(empty);
        } else {
          var maxCount = labelStats[labelKeys[0]].count;
          labelKeys.forEach(function (lbl) {
            var st = labelStats[lbl];
            var meanScore = st.scoreSum / st.count;
            var pct = maxCount > 0 ? Math.round((st.count / maxCount) * 100) : 0;
            chartLabels.appendChild(
              createBarRow(
                lbl,
                st.count + " kasus · avg skor " + formatScore(meanScore),
                pct,
                "sim-bar-fill--red"
              )
            );
          });
        }
      }

      if (queueCount) {
        queueCount.textContent = total + " baris";
      }

      if (queueList) {
        queueList.textContent = "";
        activeBatch.forEach(function (item) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "queue-item" + (item.id === selectedRowId ? " is-active" : "");
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", String(item.id === selectedRowId));

          var top = document.createElement("div");
          top.className = "queue-item__top";
          var idSpan = document.createElement("span");
          idSpan.className = "queue-item__id num";
          idSpan.textContent = item.id + " · " + item.question + " (Jawab: " + item.answer + ")";
          var tag = document.createElement("span");
          tag.className = item.priorityKey === "tinggi"
            ? "tag tag--red"
            : item.priorityKey === "sedang"
              ? "tag tag--amber"
              : "tag tag--teal";
          tag.textContent = item.label ? item.label : item.explanationLabel;
          top.appendChild(idSpan);
          top.appendChild(tag);

          var exp = document.createElement("p");
          exp.className = "queue-item__text";
          exp.textContent = item.explanation;

          btn.appendChild(top);
          btn.appendChild(exp);

          btn.addEventListener("click", function () {
            selectedRowId = item.id;
            $$(".queue-item", queueList).forEach(function (el) {
              el.classList.remove("is-active");
              el.setAttribute("aria-selected", "false");
            });
            btn.classList.add("is-active");
            btn.setAttribute("aria-selected", "true");
            renderInspector(item);
          });

          queueList.appendChild(btn);
        });
      }
    }

    function setHighlightedQuote(container, text, terms) {
      container.textContent = "";
      if (!text) {
        container.textContent = "(Tidak ada teks penjelasan)";
        return;
      }
      var matchedTerm = null;
      var matchIdx = -1;
      var lower = text.toLowerCase();
      (terms || []).forEach(function (term) {
        if (matchedTerm) {
          return;
        }
        var idx = lower.indexOf(term.toLowerCase());
        if (idx !== -1) {
          matchedTerm = text.substr(idx, term.length);
          matchIdx = idx;
        }
      });

      if (matchIdx === -1 || !matchedTerm) {
        container.textContent = "“" + text + "”";
        return;
      }

      container.appendChild(document.createTextNode("“" + text.slice(0, matchIdx)));
      var mark = document.createElement("mark");
      mark.className = "evidence-mark";
      mark.textContent = matchedTerm;
      container.appendChild(mark);
      container.appendChild(document.createTextNode(text.slice(matchIdx + matchedTerm.length) + "”"));
    }

    function renderInspector(item) {
      if (!item) {
        return;
      }
      dxMetaId.textContent = "HASIL EVALUASI · " + item.id + " · " + item.question + " · OPSI DIPILIH: " + item.answer;

      var isHidden = item.answerStatus === "benar" && item.explanationClass === "miskonsepsi";
      var isFalseCorrect = item.answerStatus === "salah" && item.explanationClass === "benar";

      if (isHidden) {
        dxCardTitle.textContent = "Jawaban benar, tetapi penalaran mengandung miskonsepsi (" + item.label + ")";
      } else if (isFalseCorrect) {
        dxCardTitle.textContent = "Jawaban salah di opsi, tetapi penalaran konsep sudah benar";
      } else if (item.explanationClass === "miskonsepsi") {
        dxCardTitle.textContent = "Miskonsepsi terdeteksi: " + (item.label || "Perlu tinjauan");
      } else if (item.explanationClass === "benar") {
        dxCardTitle.textContent = "Paham utuh: jawaban dan penalaran selaras";
      } else {
        dxCardTitle.textContent = "Penjelasan belum cukup jelas untuk dinilai otomatis";
      }

      dxPriorityTag.textContent = "Prioritas " + item.priority;
      dxPriorityTag.className = item.priorityKey === "tinggi"
        ? "tag tag--red"
        : item.priorityKey === "sedang"
          ? "tag tag--amber"
          : "tag tag--teal";

      dxAutograderVerdict.textContent = item.answerStatus === "benar"
        ? "Benar (100%) — Lolos tanpa pemeriksaan alasan"
        : "Salah (0%) — Langsung dikirim ke remedial";

      dxDiamisVerdict.textContent = isHidden
        ? "Prioritas Tinggi — Tinjau miskonsepsi " + item.label
        : isFalseCorrect
          ? "Prioritas Tinggi — Cek instruksi/opsi, bukan remedial konsep"
          : item.explanationClass === "miskonsepsi"
            ? "Remedial Terarah — Fokus pada pola " + item.label
            : item.explanationClass === "benar"
              ? "Tuntas — Jawaban dan alasan konsisten"
              : "Tinjau Singkat — Minta siswa memperjelas alasan";

      setHighlightedQuote(dxHighlightedQuote, item.explanation, item.highlightTerms);

      var defInfo = item.label && labelDefs[item.label] ? labelDefs[item.label] : null;
      if (defInfo) {
        dxRationale.textContent = "Analisis model: " + defInfo.def;
        dxLabelDef.textContent = "Definisi " + defInfo.name + ": " + defInfo.def;
        dxTeacherRec.textContent = defInfo.rec;
      } else if (isFalseCorrect) {
        dxRationale.textContent = "Analisis model: Siswa sudah menyebut konsep dan hasil yang benar di dalam penjelasan, namun memilih opsi yang belum disederhanakan atau salah klik.";
        dxLabelDef.textContent = "Tidak ada label miskonsepsi yang diaktifkan karena penalaran bernilai Benar.";
        dxTeacherRec.textContent = "Konfirmasi ketelitian membaca instruksi soal ('bentuk paling sederhana') tanpa perlu mengulang materi konsep dasar.";
      } else if (item.explanationClass === "benar") {
        dxRationale.textContent = "Analisis model: Langkah operasi dan alasan konseptual sesuai dengan kunci penyelesaian.";
        dxLabelDef.textContent = "Penjelasan diklasifikasikan Benar; penama miskonsepsi tidak diaktifkan.";
        dxTeacherRec.textContent = "Tidak memerlukan intervensi remedial. Siswa dapat lanjut ke soal pengayaan.";
      } else {
        dxRationale.textContent = "Analisis model: Kalimat terlalu singkat atau tidak memuat langkah matematis yang dapat diverifikasi.";
        dxLabelDef.textContent = "Model memilih abstain (Tidak jelas) agar tidak memaksakan label miskonsepsi yang keliru.";
        dxTeacherRec.textContent = "Tanyakan secara singkat kepada siswa bagaimana ia memperoleh jawaban tersebut.";
      }

      dxMainScore.textContent = "Skor: " + formatScore(item.score);
      dxLabelSpaceTag.textContent = "Ruang label: " + item.question;

      dxDetectorBars.textContent = "";
      [
        { label: "Miskonsepsi", val: item.detectorScores.miskonsepsi, cls: "sim-bar-fill--red" },
        { label: "Penjelasan Benar", val: item.detectorScores.benar, cls: "sim-bar-fill--teal" },
        { label: "Tidak Jelas", val: item.detectorScores.tidakJelas, cls: "sim-bar-fill--amber" }
      ].forEach(function (row) {
        dxDetectorBars.appendChild(
          createBarRow(row.label, formatScore(row.val) + " (" + Math.round(row.val * 100) + "%)", Math.round(row.val * 100), row.cls)
        );
      });

      dxNamerBars.textContent = "";
      item.candidates.forEach(function (cand, idx) {
        var cls = (item.explanationClass === "miskonsepsi" && idx === 0) ? "sim-bar-fill--red" : "sim-bar-fill--ink";
        dxNamerBars.appendChild(
          createBarRow(
            "#" + (idx + 1) + " " + cand.label,
            formatScore(cand.score) + " (" + Math.round(cand.score * 100) + "%)",
            Math.round(cand.score * 100),
            cls
          )
        );
      });
    }

    function populateQuestionControls() {
      var qId = selQuestion.value;
      var qMeta = questions[qId] || questions.Q89443;

      selAnswer.textContent = "";
      qMeta.options.forEach(function (opt) {
        var option = document.createElement("option");
        option.value = opt;
        option.textContent = opt + (opt === qMeta.key ? " (Kunci Benar)" : "");
        selAnswer.appendChild(option);
      });

      selPreset.textContent = "";
      qMeta.presets.forEach(function (preset, idx) {
        var option = document.createElement("option");
        option.value = String(idx);
        option.textContent = preset.name;
        selPreset.appendChild(option);
      });

      if (qMeta.presets[0]) {
        selAnswer.value = qMeta.presets[0].answer;
        txtExplanation.value = qMeta.presets[0].text;
      }
    }

    function parseCsvText(text) {
      var clean = text.replace(/^\uFEFF/, "").trim();
      if (!clean) {
        return [];
      }
      var lines = clean.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
      if (lines.length < 2) {
        return [];
      }

      function splitCsvLine(line) {
        var result = [];
        var cur = "";
        var inQuotes = false;
        for (var i = 0; i < line.length; i++) {
          var ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i += 1;
            } else {
              inQuotes = !inQuotes;
            }
          } else if ((ch === "," || ch === ";") && !inQuotes) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += ch;
          }
        }
        result.push(cur.trim());
        return result;
      }

      var headers = splitCsvLine(lines[0]).map(function (h) {
        return h.toLowerCase().replace(/[^a-z0-9_]/g, "");
      });

      return lines.slice(1).map(function (line, idx) {
        var cols = splitCsvLine(line);
        var obj = {};
        headers.forEach(function (h, i) {
          obj[h] = cols[i] || "";
        });
        return {
          id: obj.id || obj.rowid || obj.row_id || ("CSV-" + String(idx + 1).padStart(3, "0")),
          question: obj.soal || obj.question || obj.questionid || "Q89443",
          answer: obj.jawaban || obj.answer || obj.mc_answer || "-3",
          explanation: obj.penjelasan || obj.explanation || obj.studentexplanation || "",
          label: obj.label && obj.label !== "Tidak ada" ? obj.label : ""
        };
      });
    }

    function loadBatchData(rawRows, sourceTitle) {
      activeBatch = rawRows.map(function (r, idx) {
        return evaluateResponse(r, idx);
      });
      selectedRowId = activeBatch[0] ? activeBatch[0].id : null;
      if (batchSourceLabel) {
        batchSourceLabel.textContent = "Sumber aktif: " + sourceTitle + " (" + activeBatch.length + " respons dievaluasi). Klik baris di bawah untuk memeriksa detail.";
      }
      renderBatchSummary();
      if (activeBatch[0]) {
        renderInspector(activeBatch[0]);
      }
    }

    if (btnLoadSample) {
      btnLoadSample.addEventListener("click", function () {
        loadBatchData(baseRows, "Sampel Sintetis DIAMIS (20 respons, 4 soal)");
        if (uploadStatus) {
          uploadStatus.textContent = "Berhasil memuat 20 respons sampel lintas 4 soal matematika.";
        }
        showToast("20 respons sampel dimuat dan dievaluasi.");
      });
    }

    if (btnDownloadSample) {
      btnDownloadSample.addEventListener("click", function () {
        var sampleLines = [
          ["ID", "Soal", "Jawaban", "Penjelasan"],
          ["UJI-001", "Q89443", "-3", "8 dikurangi 5 sama dengan 3, lalu saya tambahkan tanda negatif."],
          ["UJI-002", "Q31772", "3/9", "Ada 3 dari 9 bagian tidak diarsir, itu sama dengan sepertiga (1/3)."],
          ["UJI-003", "Q31778", "6", "15 dikurangi 9 selisihnya 6, jadi nilai A adalah 6."],
          ["UJI-004", "Q33472", "3/8", "Tambahkan atas dengan atas 1 + 2 = 3, dan bawah dengan bawah 3 + 5 = 8."],
          ["UJI-005", "Q33472", "3/15", "Samakan penyebut 3 dikali 5 jadi 15, lalu atasnya 1 ditambah 2 jadi 3/15."],
          ["UJI-006", "Q89443", "-3", "(-8) - (-5) = -8 + 5 = -3, karena mengurangi negatif sama dengan menambah positif."]
        ];
        var csv = sampleLines.map(function (row) {
          return row.map(function (cell) {
            return '"' + String(cell).replace(/"/g, '""') + '"';
          }).join(",");
        }).join("\r\n");
        var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "diamis-contoh-unggahan-siswa.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
        showToast("Contoh CSV berhasil diunduh. Silakan coba unggah berkas tersebut.");
      });
    }

    function handleUploadedFile(file) {
      if (!file) {
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var content = String(e.target.result || "");
          var parsed = [];
          if (file.name.toLowerCase().endsWith(".json")) {
            var json = JSON.parse(content);
            parsed = Array.isArray(json) ? json : (json.rows || []);
          } else {
            parsed = parseCsvText(content);
          }
          if (!parsed || parsed.length === 0) {
            showToast("Berkas tidak berisi baris data yang valid.");
            return;
          }
          loadBatchData(parsed, "Berkas Unggahan: " + file.name);
          if (uploadStatus) {
            uploadStatus.textContent = "Berhasil mengevaluasi " + parsed.length + " respons dari berkas " + file.name + ".";
          }
          showToast("Berhasil mengevaluasi " + parsed.length + " respons dari " + file.name + ".");
        } catch (err) {
          showToast("Gagal membaca berkas. Pastikan format CSV atau JSON sesuai contoh.");
        }
      };
      reader.readAsText(file);
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files[0]) {
          handleUploadedFile(fileInput.files[0]);
          fileInput.value = "";
        }
      });
    }

    if (uploadTrigger && fileInput) {
      uploadTrigger.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          fileInput.click();
        }
      });
    }

    if (dropzone) {
      ["dragenter", "dragover"].forEach(function (evName) {
        dropzone.addEventListener(evName, function (e) {
          e.preventDefault();
          dropzone.classList.add("is-dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (evName) {
        dropzone.addEventListener(evName, function (e) {
          e.preventDefault();
          dropzone.classList.remove("is-dragover");
        });
      });
      dropzone.addEventListener("drop", function (e) {
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files[0]) {
          handleUploadedFile(files[0]);
        }
      });
    }

    if (selQuestion) {
      selQuestion.addEventListener("change", function () {
        populateQuestionControls();
        var item = evaluateResponse({
          id: "UJI-LANGSUNG",
          question: selQuestion.value,
          answer: selAnswer.value,
          explanation: txtExplanation.value
        }, 0);
        renderInspector(item);
      });
    }

    if (selPreset) {
      selPreset.addEventListener("change", function () {
        var qMeta = questions[selQuestion.value] || questions.Q89443;
        var preset = qMeta.presets[Number(selPreset.value)];
        if (preset) {
          selAnswer.value = preset.answer;
          txtExplanation.value = preset.text;
          var item = evaluateResponse({
            id: "UJI-LANGSUNG",
            question: selQuestion.value,
            answer: selAnswer.value,
            explanation: txtExplanation.value
          }, 0);
          renderInspector(item);
        }
      });
    }

    if (testForm) {
      testForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var customItem = evaluateResponse({
          id: "UJI-LANGSUNG",
          question: selQuestion.value,
          answer: selAnswer.value,
          explanation: txtExplanation.value
        }, 0);
        renderInspector(customItem);
        showToast("Diagnosis diperbarui untuk input uji langsung.");
      });
    }

    populateQuestionControls();
    loadBatchData(baseRows, "Sampel Sintetis DIAMIS (20 respons, 4 soal)");
  }

  function start() {
    initHeader();
    var page = document.body.getAttribute("data-page");
    if (page === "case") {
      initCase();
    }
    if (page === "data") {
      initData();
    }
    if (page === "simulate") {
      initSimulate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
