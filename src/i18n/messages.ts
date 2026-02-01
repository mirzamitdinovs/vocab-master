export async function getMessages(locale: string) {
  switch (locale) {
    case "ru":
      return (await import("@/messages/ru.json")).default;
    case "uz":
      return (await import("@/messages/uz.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}
