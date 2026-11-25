/** Windows browsers often omit or mis-set file.type — infer from the extension. */
export function guessImageMime(file) {
  const type = file?.type?.toLowerCase() ?? "";
  if (type.startsWith("image/") && type !== "image/*" && !type.includes("octet-stream")) {
    return type;
  }
  const name = (file?.name ?? "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}
