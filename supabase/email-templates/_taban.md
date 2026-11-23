# E-posta şablonları

Supabase → Authentication → **Email Templates** altında ilgili şablonun
HTML'ini bu dosyalardaki içerikle değiştir.

| Dosya | Supabase şablonu | Ne zaman gider |
|---|---|---|
| `dogrulama.html` | Confirm signup | Kayıt olurken |
| `davet.html` | Invite user | Ayarlar → Kullanıcılar → personel daveti |
| `sifre-sifirlama.html` | Reset password | Şifremi unuttum |

## Neden tablo düzeni ve satır içi stil

E-posta istemcileri (özellikle Outlook) modern CSS'in çoğunu yok sayıyor:
flexbox, grid, harici stil dosyası, `<style>` bloğu çalışmayabiliyor. Bu yüzden
düzen `<table>` ile, stiller `style=""` özniteliğiyle yazıldı. Çirkin ama
tek güvenilir yol.

Degrade kullanılmadı — Gmail ve Outlook `linear-gradient`'ı düşürüyor ve
düğme arka planı kayboluyor. Marka rengi düz renk olarak kullanıldı.

Logo görsel olarak konmadı: SVG'yi çoğu istemci engelliyor, PNG içinse
herkese açık bir barındırma adresi gerekir. Marka adı metin olarak yazıldı,
her yerde sorunsuz görünüyor.

## Değişkenler

- `{{ .ConfirmationURL }}` — tıklanacak bağlantı (zorunlu)
- `{{ .TokenHash }}` — `dogrulama.html` ve `sifre-sifirlama.html` bağlantıyı
  `{{ .SiteURL }}/auth/callback?token_hash=...&type=...` olarak kendisi kuruyor.
  `ConfirmationURL` Supabase'in `/verify` adresinden geçip `redirectTo`'ya
  gidiyor; adres Redirect URLs listesine uymazsa sessizce Site URL'e (`/`)
  düşüyor ve oturumu açık kullanıcı şifre formu yerine panele atılıyordu.
- `{{ .Email }}` — alıcının e-posta adresi

## Önemli: gönderen adresi

Şablonu değiştirmek e-postanın **kimden geldiğini** değiştirmiyor. Varsayılan
olarak Supabase'in sunucusundan `noreply@mail.app.supabase.io` adresiyle
gider ve saatte birkaç mesajla sınırlıdır — üretimde bu limit personel daveti
ve şifre sıfırlamayı sessizce engeller.

`noreply@davetpro.com` adresinden göndermek ve limiti kaldırmak için:
Project Settings → Authentication → **SMTP Settings**.
