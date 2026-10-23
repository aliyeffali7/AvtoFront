import type { Dict } from '../index'

// Messages returned by the Django backend (exact match with the backend text).
const ru: Dict = {
  // accounts
  'Hesabınız admin tərəfindən dayandırılıb — hazırda yalnız baxa bilərsiniz. Ətraflı məlumat üçün bizimlə əlaqə saxlayın.':
    'Ваш аккаунт приостановлен администратором — сейчас доступен только просмотр. Для подробностей свяжитесь с нами.',
  'Abunəliyinizin müddəti bitib — hazırda yalnız baxa bilərsiniz. Davam etmək üçün bizimlə əlaqə saxlayın.':
    'Срок вашей подписки истёк — сейчас доступен только просмотр. Чтобы продолжить, свяжитесь с нами.',
  'Bu əməliyyat yalnız biznes sahibi üçündür.': 'Это действие доступно только владельцу бизнеса.',
  'Business owner access required.': 'Требуется доступ владельца бизнеса.',
  'Şəkil 5 MB-dan böyük ola bilməz.': 'Размер изображения не должен превышать 5 МБ.',
  'Yalnız şəkil faylları qəbul edilir.': 'Принимаются только файлы изображений.',
  'Biznes kodu tələb olunur.': 'Укажите код бизнеса.',
  'Biznes kodu yanlışdır.': 'Неверный код бизнеса.',
  'Şifrələr uyğun gəlmir.': 'Пароли не совпадают.',
  'Passwords do not match.': 'Пароли не совпадают.',
  'A user with this email already exists.': 'Пользователь с таким email уже существует.',
  'Sessiya tapılmadı, yenidən daxil olun.': 'Сессия не найдена, войдите заново.',
  'Sessiya bitib, yenidən daxil olun.': 'Сессия истекла, войдите заново.',
  'Əgər bu email qeydiyyatdan keçibsə, sıfırlama kodu göndərildi.':
    'Если этот email зарегистрирован, код для сброса отправлен.',
  'Kod yanlışdır və ya vaxtı bitib.': 'Код неверный или срок его действия истёк.',
  'Şifrə uğurla dəyişdirildi. İndi yeni şifrə ilə daxil ola bilərsiniz.':
    'Пароль успешно изменён. Теперь вы можете войти с новым паролем.',
  'Bu biznesin sahibi tapılmadı.': 'Владелец этого бизнеса не найден.',
  'Bu biznes bloklanıb — əvvəlcə aktivləşdirin.': 'Этот бизнес заблокирован — сначала активируйте его.',
  'Aktiv impersonasiya tapılmadı.': 'Активный вход от имени пользователя не найден.',
  'No business linked to this account.': 'К этому аккаунту не привязан бизнес.',
  'No business linked.': 'Бизнес не привязан.',
  'Forbidden.': 'Доступ запрещён.',
  'CSRF token missing or invalid.': 'CSRF-токен отсутствует или недействителен.',

  // crm
  'Yanlış etiraz etiketi.': 'Неверная метка возражения.',
  'Faiz 0 ilə 100 arasında olmalıdır.': 'Процент должен быть от 0 до 100.',
  'Məbləğ 0-dan böyük olmalıdır.': 'Сумма должна быть больше 0.',
  'Bu biznes artıq başqa karta bağlıdır.': 'Этот бизнес уже привязан к другой карточке.',
  'Məbləğ borcdan çox ola bilməz.': 'Сумма не может превышать долг.',

  // finance
  'Bu kateqoriya əl ilə seçilə bilməz.': 'Эту категорию нельзя выбрать вручную.',
  'Bu kateqoriya bu növ qeydə uyğun deyil.': 'Эта категория не подходит для этого типа записи.',
  'Bu qeyd sistem tərəfindən yaradılıb (sifariş, alış və ya ödəniş) — burada dəyişdirilə və silinə bilməz. Onu yaradan əməliyyatı (sifarişi, alışı, borcu) düzəldin.':
    'Эта запись создана системой (заказ, закупка или платёж) — здесь её нельзя изменить или удалить. Исправьте операцию, которая её создала (заказ, закупку, долг).',
  'Tarix düzgün deyil (YYYY-MM-DD).': 'Неверная дата (ГГГГ-ММ-ДД).',
  'Yanlış məbləğ.': 'Неверная сумма.',
  'from və to query parametrləri tələb olunur (YYYY-MM-DD).':
    'Необходимо указать параметры from и to (ГГГГ-ММ-ДД).',
  'status open, paid və ya all olmalıdır.': 'Статус должен быть open, paid или all.',
  'date query param required (YYYY-MM-DD).': 'Необходимо указать параметр date (ГГГГ-ММ-ДД).',
  'Invalid date': 'Неверная дата.',
  'Qaytarma yalnız tamamlanmış sifariş üçündür. Açıq sifarişdə məhsulu sadəcə silin.':
    'Возврат возможен только для завершённого заказа. В открытом заказе просто удалите товар.',
  'Miqdar tam ədəd olmalıdır.': 'Количество должно быть целым числом.',
  'Müştərinin özü gətirdiyi hissə qaytarılmır: servis onu satmayıb.':
    'Запчасть, привезённая клиентом, не возвращается: сервис её не продавал.',
  'Qaytarmadan sonra məbləğ endirimdən az olur — əvvəlcə endirimi azaldın.':
    'После возврата сумма станет меньше скидки — сначала уменьшите скидку.',
  'Ödəniş yalnız tamamlanmış sifarişlər üçün qeyd edilə bilər.':
    'Оплату можно записать только для завершённых заказов.',
  'Yanlış endirim məbləği.': 'Неверная сумма скидки.',
  'Endirim ümumi məbləğdən az olmalıdır.': 'Скидка должна быть меньше общей суммы.',
  'Ödəniləcək məhsul seçilməyib.': 'Не выбраны товары для оплаты.',
  'Yanlış məhsul.': 'Неверный товар.',
  'Bu borc artıq ödənilib.': 'Этот долг уже оплачен.',

  // mechanics
  'Bu telefon nömrəsi ilə artıq usta mövcuddur.': 'Мастер с таким номером телефона уже существует.',
  'İşdən çıxma tarixi işə başlamadan əvvəl ola bilməz.': 'Дата увольнения не может быть раньше даты приёма на работу.',

  // orders
  'Bu usta mövcud deyil.': 'Такого мастера не существует.',
  'Bu hazır iş mövcud deyil.': 'Такой готовой работы не существует.',
  'Usta payı işin qiymətindən çox ola bilməz.': 'Доля мастера не может превышать стоимость работы.',
  'İşin adını yazın.': 'Укажите название работы.',
  'Bu adda hazır iş artıq var.': 'Готовая работа с таким названием уже существует.',
  'Qiymət mənfi ola bilməz.': 'Цена не может быть отрицательной.',
  'Usta payı mənfi ola bilməz.': 'Доля мастера не может быть отрицательной.',
  'Məhsul seçin.': 'Выберите товар.',
  'Bu məhsul mövcud deyil.': 'Такого товара не существует.',
  'Məhsul sətri tapılmadı.': 'Строка товара не найдена.',
  'Invalid mechanic for this business.': 'Недопустимый мастер для этого бизнеса.',
  'Invalid customer for this business.': 'Недопустимый клиент для этого бизнеса.',
  'Ödənilmiş sifariş dəyişdirilə bilməz.': 'Оплаченный заказ нельзя изменить.',
  'Tamamlanmış sifarişin məhsul və işləri dəyişdirilmir. Dəyişmək üçün statusu "İcrada" edin; müştəri hissəni geri gətiribsə "Qaytar" düyməsini istifadə edin.':
    'Товары и работы завершённого заказа не изменяются. Чтобы изменить, переведите статус в «В работе»; если клиент вернул запчасть, нажмите «Вернуть».',
  'Miqdar və qiymətlər rəqəm olmalıdır.': 'Количество и цены должны быть числами.',
  'Miqdar 0-dan böyük olmalıdır.': 'Количество должно быть больше 0.',
  'Məhsul tapılmadı.': 'Товар не найден.',
  'Məhsulun adını yazın.': 'Укажите название товара.',
  'Mağaza tapılmadı.': 'Магазин не найден.',
  'paid_amount tələb olunur.': 'Необходимо указать paid_amount.',
  'Müştərinin özü gətirdiyi hissənin qiyməti olmur.': 'У запчасти, привезённой клиентом, не бывает цены.',
  'Satış qiyməti rəqəm olmalıdır.': 'Цена продажи должна быть числом.',
  'Satış qiyməti mənfi ola bilməz.': 'Цена продажи не может быть отрицательной.',
  'Miqdar müsbət tam ədəd olmalıdır.': 'Количество должно быть целым положительным числом.',
  'Fayl seçilməyib.': 'Файл не выбран.',
  'Fayl ölçüsü 5 MB-dan çox ola bilməz.': 'Размер файла не должен превышать 5 МБ.',
  'Link tapılmadı və ya artıq etibarsızdır.': 'Ссылка не найдена или уже недействительна.',

  // reservations
  'Bu iş üçün etibarsız usta.': 'Недопустимый мастер для этой работы.',
  'Bu rezervasiya artıq sifarişə çevrilib.': 'Эта запись уже превращена в заказ.',

  // stores
  'Bu tədarükçüdən alışlar var — silmək olmaz. Lazımdırsa başqa tədarükçü ilə birləşdirin.':
    'Есть закупки у этого поставщика — удалить нельзя. При необходимости объедините его с другим поставщиком.',

  // warehouse
  'Fayl oxuna bilmədi. Düzgün Excel faylı yükləyin.': 'Не удалось прочитать файл. Загрузите корректный файл Excel.',
  'Başlıq sətri tapılmadı. Faylda "Adı", "Sayı", "Gross qiyməti" və ya oxşar sütunlar olmalıdır.':
    'Строка заголовков не найдена. В файле должны быть столбцы «Adı», «Sayı», «Gross qiyməti» или похожие.',
  'Mağaza seçilməlidir.': 'Необходимо выбрать магазин.',
  'Heç bir məhsul seçilməyib.': 'Не выбрано ни одного товара.',
  'Bu alış artıq ləğv edilib.': 'Эта закупка уже отменена.',
  'Bu alışın məhsullarından artıq istifadə olunub — ləğv etmək olmaz. Qaytarma edin.':
    'Товары из этой закупки уже использованы — отменить нельзя. Оформите возврат.',
  'Bu borca artıq ödəniş edilib — ləğv etmək olmaz.': 'По этому долгу уже есть оплата — отменить нельзя.',
  'Yanlış seçim: alışı ləğv etmək və ya anbarda saxlamaq olar.':
    'Неверный выбор: закупку можно отменить или оставить на складе.',
  'Sayılan miqdar mənfi ola bilməz.': 'Подсчитанное количество не может быть отрицательным.',
  'Bu məhsulları birləşdirmək olmaz.': 'Эти товары нельзя объединить.',
  'Bu tədarükçüləri birləşdirmək olmaz.': 'Этих поставщиков нельзя объединить.',
  'Anbar hesabatı: hər hərəkət növü dəqiq bir sütuna aid olmalıdır.':
    'Отчёт по складу: каждый тип движения должен относиться ровно к одному столбцу.',
  'Alış qiyməti rəqəm olmalıdır.': 'Закупочная цена должна быть числом.',
  'Tarix düzgün deyil.': 'Неверная дата.',
  'Məhsulun adı boş ola bilməz.': 'Название товара не может быть пустым.',
  'Heç bir məhsul əlavə edilməyib.': 'Не добавлено ни одного товара.',
  'Yanlış məhsul sətri.': 'Неверная строка товара.',
  'Stok əl ilə dəyişdirilmir — alış, silinmə və ya sayım edin.':
    'Остаток не изменяется вручную — оформите закупку, списание или пересчёт.',
  'Sayılan miqdar tam ədəd olmalıdır.': 'Подсчитанное количество должно быть целым числом.',
  'ids siyahısı tələb olunur.': 'Необходимо указать список ids.',
  'Yalnız .xlsx və ya .xls faylları qəbul edilir.': 'Принимаются только файлы .xlsx или .xls.',
  'Bu alış ləğv edilib.': 'Эта закупка отменена.',
  'Bu borc alışdan yaranıb — silmək üçün Alışlar bölməsində alışı ləğv edin.':
    'Этот долг возник из закупки — чтобы удалить его, отмените закупку в разделе «Закупки».',
  'Bu borca ödəniş edilib — silmək olmaz.': 'По этому долгу есть оплата — удалить нельзя.',
}

export default ru
