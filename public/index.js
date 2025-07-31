const elements = {
    title: document.getElementById("title"),
    greeting: document.getElementById("greeting"),
    q1: document.getElementById("q1"),
    a1: document.getElementById("a1"),
    q2: document.getElementById("q2"),
    a2: document.getElementById("a2"),
    q3: document.getElementById("q3"),
    a3: document.getElementById("a3")
  };
  
  function setLanguage(lang) {
    const t = translations[lang];
    if (!t) return;
    elements.title.textContent = t.title;
    elements.greeting.textContent = t.greeting;
    elements.q1.textContent = t.q1;
    elements.a1.textContent = t.a1;
    elements.q2.textContent = t.q2;
    elements.a2.textContent = t.a2;
    elements.q3.textContent = t.q3;
    elements.a3.textContent = t.a3;
    localStorage.setItem("preferredLang", lang);
  }
  
  document.getElementById("language-select").addEventListener("change", (e) => {
    setLanguage(e.target.value);
  });
  
  const savedLang = localStorage.getItem("preferredLang") || "en";
  document.getElementById("language-select").value = savedLang;
  setLanguage(savedLang);