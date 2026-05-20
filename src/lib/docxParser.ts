import mammoth from "mammoth";

export type ParsedQuestion = {
  title: string; // HTML format to preserve formatting, tables, lists, and images
  type: "pilihan_ganda" | "essay";
  options: string[]; // Options A, B, C, D (for multiple choice)
  correct_answer: string; // A, B, C, D (for multiple choice) or reference answer text (for essay)
};

/**
 * Parses a Word (.docx) file from an ArrayBuffer into structured exam questions.
 */
export async function parseDocxQuestions(arrayBuffer: ArrayBuffer): Promise<ParsedQuestion[]> {
  // Convert docx to HTML using mammoth to preserve images, bold/italic, lists, and tables
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const htmlContent = result.value;

  if (typeof window === "undefined") {
    throw new Error("Parser ini hanya dapat dijalankan di lingkungan client/browser.");
  }

  // Use DOMParser to parse the generated HTML structurally
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const children = Array.from(doc.body.children);

  const questions: ParsedQuestion[] = [];
  let currentQuestion: Partial<ParsedQuestion> & { rawElements: Element[] } = {
    rawElements: [],
    options: [],
  };

  const finalizeCurrentQuestion = () => {
    if (!currentQuestion.rawElements || currentQuestion.rawElements.length === 0) return;

    // 1. Construct the question title HTML
    // We combine the paragraphs/images/tables that belong to the question body
    const div = document.createElement("div");
    currentQuestion.rawElements.forEach((el) => {
      // Clean up inline styles or attributes if needed
      div.appendChild(el.cloneNode(true));
    });
    const titleHtml = div.innerHTML.trim();

    // 2. Determine type based on options presence
    const options = currentQuestion.options ?? [];
    const hasOptions = options.length > 0;
    const type: "pilihan_ganda" | "essay" = hasOptions ? "pilihan_ganda" : "essay";

    // 3. Normalize options (ensure at least 4 options, or pad them)
    let finalizedOptions: string[] = [];
    if (type === "pilihan_ganda") {
      finalizedOptions = [...options];
      while (finalizedOptions.length < 4) {
        finalizedOptions.push("");
      }
    }

    questions.push({
      title: titleHtml || "Soal tanpa judul",
      type,
      options: finalizedOptions,
      correct_answer: currentQuestion.correct_answer || (type === "pilihan_ganda" ? "A" : ""),
    });

    // Reset for next question
    currentQuestion = {
      rawElements: [],
      options: [],
    };
  };

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const text = el.textContent?.trim() || "";

    // A. Detect new question trigger
    // Pattern matches: [SOAL], SOAL:, Soal:, [Q], Q:
    const isNewQuestion = /^(?:\[soal\]|soal:|soal\s\d+:|\[q\]|q:)/i.test(text);

    if (isNewQuestion) {
      // Save previous question
      finalizeCurrentQuestion();

      // Clean the starting keyword from the element
      const cleanEl = el.cloneNode(true) as Element;
      if (cleanEl.innerHTML) {
        cleanEl.innerHTML = cleanEl.innerHTML.replace(/^(?:\[soal\]|soal:|soal\s\d+:|\[q\]|q:)\s*/i, "");
      }
      currentQuestion.rawElements!.push(cleanEl);
      continue;
    }

    // B. Detect options
    // Pattern matches: [A], A., A), B. etc.
    const optionMatch = text.match(/^(?:\[([a-d])\]|([a-d])\.|([a-d])\))\s*(.*)/i);
    if (optionMatch && currentQuestion.rawElements && currentQuestion.rawElements.length > 0) {
      // Extract option content
      // We clone and clean the option element
      const optionEl = el.cloneNode(true) as Element;
      optionEl.innerHTML = optionEl.innerHTML.replace(/^(?:\[[a-d]\]|[a-d]\.|[a-d]\))\s*/i, "");
      
      const optionHtml = optionEl.innerHTML.trim();
      currentQuestion.options!.push(optionHtml);
      continue;
    }

    // C. Detect answer keys
    // Pattern matches: [KUNCI], KUNCI:, JAWABAN:, Kunci:, Jawaban:
    const keyMatch = text.match(/^(?:\[kunci\]|kunci:|jawaban:|key:)\s*(.*)/i);
    if (keyMatch && currentQuestion.rawElements && currentQuestion.rawElements.length > 0) {
      const keyVal = keyMatch[1].trim().toUpperCase();
      currentQuestion.correct_answer = keyVal;
      continue;
    }

    // D. Standard paragraph / image / table content - append to current question body
    if (currentQuestion.rawElements && currentQuestion.rawElements.length > 0) {
      currentQuestion.rawElements.push(el);
    }
  }

  // Finalize the last question
  finalizeCurrentQuestion();

  return questions;
}
