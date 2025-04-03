document.addEventListener("DOMContentLoaded", function () {
  const inputText = document.getElementById("inputText");
  const outputText = document.getElementById("outputText");
  const encodeBtn = document.getElementById("encodeBtn");
  const decodeBtn = document.getElementById("decodeBtn");

  encodeBtn.addEventListener("click", () => {
    try {
      const encoded = btoa(inputText.value);
      outputText.value = encoded;
    } catch (e) {
      outputText.value = "Error: Input could not be encoded.";
    }
  });

  decodeBtn.addEventListener("click", () => {
    try {
      const decoded = atob(inputText.value);
      outputText.value = decoded;
    } catch (e) {
      outputText.value = "Error: Input is not valid Base64.";
    }
  });
});