# SmartSpeech - Expo & EAS Build Workflow

Ushbu loyihada Android uchun "developer version" (Development Build) tayyorlash va Expo Cloud orqali build qilish bosqichlari:

## 1. Muhitni tayyorlash
Loyiha allaqachon Expo (SDK 54+) bilan xonadon qilingan va `expo-dev-client` o'rnatilgan. `eas.json` konfiguratsiyasi APK yaratishga moslangan.

## 2. EAS Build buyrug'i
Android APK (development version) ni bulutda build qilish uchun quyidagi buyruqni terminalda ishlating:

```bash
npx eas build --profile development --platform android
```

### Bu buyruq nima qiladi?
*   **Expo Cloud**-ga kodni yuklaydi.
*   **Development Client** buildini tayyorlaydi (bu Expo Go-ga o'xshash, lekin sizning native modullaringiz bilan).
*   Natijada **APK** fayl beradi.

## 3. Local Tarmoq orqali yangilanish (Hot Reload)
Build tugagach, APK-ni telefonga o'rnating va quyidagi bosqichlarni bajaring:

1.  Kompyuterda serverni boshlang:
    ```bash
    npx expo start --dev-client
    ```
2.  Telefon va kompyuter bitta Wi-Fi tarmog'ida ekanligiga ishonch hosil qiling.
3.  Telefondagi ilovani oching.
4.  U avtomatik ravishda local serverga ulanadi va kodni o'zgartirsangiz, telefonda darhol yangilanadi.

### Diqqat!
Birinchi marta `eas build` ishlatganingizda Expo hisobingizga kirishni va ba'zi savollarni so'raydi. Hammasiga rozilik berib o'ting.
