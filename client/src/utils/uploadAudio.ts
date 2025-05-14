export const uploadAudioBlob = async (blob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");

  const res = await fetch("http://localhost:8000/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  return data.text;
};
