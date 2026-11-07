import type { Dict } from '../index'

const ru: Dict = {
  // Page
  'Sifarişlər': 'Заказы',

  // BoughtNowRemoveModal
  'Bu hissə bu sifariş üçün alınıb. Nə edək?': 'Эта запчасть куплена под этот заказ. Что сделать?',
  'Çıxarılan miqdar bu sifariş üçün alınıb. Nə edək?': 'Снимаемое количество куплено под этот заказ. Что сделать?',
  'Bu sifarişdə sifariş üçün alınmış hissələr var. Nə edək?': 'В заказе есть запчасти, купленные под заказ. Что сделать?',
  'Hissələr həqiqətən alınıb: sifariş ləğv olunur, hissələr anbara qayıdır. Alış və borc olduğu kimi qalır.':
    'Запчасти действительно куплены: заказ отменяется, запчасти возвращаются на склад. Закупка и долг остаются как есть.',
  'Hissə həqiqətən alınıb: çıxarılan miqdar anbara qayıdır. Alış və borc olduğu kimi qalır.':
    'Запчасть действительно куплена: снимаемое количество возвращается на склад. Закупка и долг остаются как есть.',
  'Hissə həqiqətən alınıb: sifarişdən çıxır, anbara qayıdır. Alış və borc olduğu kimi qalır.':
    'Запчасть действительно куплена: она убирается из заказа и возвращается на склад. Закупка и долг остаются как есть.',
  'Sifariş ləğv olunur və bu hissələrin alışı da ləğv olunur: stok dəyişmir, kreditor borcu silinir, nağd ödənilibsə pul kassaya qayıdır.':
    'Заказ отменяется, и закупка этих запчастей тоже отменяется: остаток не меняется, долг кредитору списывается, а если платили наличными, деньги возвращаются в кассу.',
  'Hissə sifarişdən çıxır və alış da ləğv olunur: stok dəyişmir, kreditor borcu silinir, nağd ödənilibsə pul kassaya qayıdır.':
    'Запчасть убирается из заказа, и закупка тоже отменяется: остаток не меняется, долг кредитору списывается, а если платили наличными, деньги возвращаются в кассу.',
  'Ləğv': 'Отмена',
  '{n} ədəd': '{n} шт.',
  'Alışı ləğv et (səhv yazılıb)': 'Отменить закупку (записана по ошибке)',
  'Anbarda saxla': 'Оставить на складе',

  // ServiceTemplatePicker
  'Hazır iş seç...': 'Выберите готовую работу...',
  'Hazır iş': 'Готовая работа',
  'Hazır iş tapılmadı': 'Готовая работа не найдена',

  // ServiceForm / mechanic line
  'İş adı': 'Название работы',
  'Qiymət ₼': 'Цена ₼',
  'Qiymət': 'Цена',
  'Usta': 'Мастер',
  '— Usta yoxdur': '— Без мастера',
  'Usta payı': 'Доля мастера',
  'Hazır iş — sabit pay': 'Готовая работа — фиксированная доля',
  'Usta təyin edilməyib': 'Мастер не назначен',

  // Messages / confirms
  'Kopyalamaq alınmadı. Link: {url}': 'Не удалось скопировать. Ссылка: {url}',
  'Linki yenilə': 'Обновить ссылку',
  'Müştəriyə əvvəl göndərilmiş link işləməyəcək. Yeni link yaradılsın?': 'Ранее отправленная клиенту ссылка перестанет работать. Создать новую ссылку?',
  'Yenilə': 'Обновить',
  'Bəli': 'Да',
  'Hansı mağazadan alındığını yazın.': 'Укажите, в каком магазине куплено.',
  'Qaytarış qeyd olundu. Müştəriyə {amount} qaytarın — kassadan çıxdı.': 'Возврат записан. Верните клиенту {amount} — деньги списаны из кассы.',
  'Qaytarış qeyd olundu. Müştərinin borcu azaldı.': 'Возврат записан. Долг клиента уменьшен.',
  'Məhsulu sil': 'Удалить товар',
  'Bu məhsulu sifarişdən çıxarmaq istəyirsiniz? Stoka qaytarılacaq.': 'Убрать этот товар из заказа? Он вернётся на склад.',
  'Sil': 'Удалить',
  'Miqdar tam ədəd olmalıdır (0 = sətri çıxar).': 'Количество должно быть целым числом (0 = убрать строку).',
  'Usta payı işin qiymətindən çox ola bilməz.': 'Доля мастера не может быть больше цены работы.',
  'İşi sil': 'Удалить работу',
  'Bu işi sifarişdən silmək istəyirsiniz?': 'Удалить эту работу из заказа?',
  'Fayl ölçüsü 5 MB-dan çox ola bilməz.': 'Размер файла не может превышать 5 МБ.',
  'Şəkli sil': 'Удалить фото',
  'Bu şəkli silmək istəyirsiniz?': 'Удалить это фото?',
  'Sifarişi ləğv et': 'Отменить заказ',
  'Bu sifarişi ləğv etmək istəyirsiniz? Bütün ödəniş qeydləri maliyyədən silinəcək, anbar stoku bərpa ediləcək. Bu əməliyyat geri alına bilməz.':
    'Отменить этот заказ? Все записи об оплате будут удалены из финансов, остатки на складе будут восстановлены. Это действие нельзя отменить.',
  'Ləğv et': 'Отменить',
  'Sifariş tapılmadı və ya yüklənmədi.': 'Заказ не найден или не загрузился.',

  // Header & notes
  'Sifariş': 'Заказ',
  'Müştərinin müraciəti': 'Обращение клиента',
  'Diaqnostika nəticəsi': 'Результат диагностики',
  'Sifariş tamamlanıb və hesabata yazılıb. İş və ya məhsulu dəyişmək üçün statusu "İcrada" edin; müştəri hissəni geri gətiribsə "Məhsullar" bölməsində "Müştəri qaytarması"nı seçin.':
    'Заказ завершён и учтён в отчёте. Чтобы изменить работу или товар, переведите статус в «В работе»; если клиент вернул запчасть, выберите «Возврат клиента» в разделе «Товары».',

  // Services
  'Xidmətlər': 'Услуги',
  '+ Əlavə et': '+ Добавить',
  'Əlavə et': 'Добавить',
  'Saxla': 'Сохранить',
  'İş qeyd edilməyib.': 'Работы не добавлены.',
  'Düzəlt': 'Изменить',
  'Cəmi': 'Итого',

  // Products
  'Məhsullar': 'Товары',
  'Anbarda var': 'Есть на складе',
  'Anbarda yoxdur': 'Нет на складе',
  'Qaytarmanı bağla': 'Закрыть возврат',
  'Müştəri qaytarması': 'Возврат клиента',
  'Müştəri hissəni geri gətirib? Qaytarılan hissə stoka qayıdır, hesabatdan çıxılır; ödənilmiş məbləğ kassadan qaytarılır.':
    'Клиент вернул запчасть? Возвращённая запчасть вернётся на склад и будет убрана из отчёта; оплаченная сумма вернётся из кассы.',
  'Bəli, qaytarma et': 'Да, оформить возврат',
  'Seçin...': 'Выберите...',
  'stokda yoxdur': 'нет в наличии',
  'Stokda olmayan hissə üçün yuxarıdakı': 'Для запчасти, которой нет в наличии, нажмите кнопку',
  'düyməsini basın.': 'выше.',
  'Miqdar': 'Количество',
  'Hissə indi mağazadan alınıb bu sifarişə qoyulur. Eyni adlı məhsul varsa, yenisi yaradılmır.':
    'Запчасть сейчас куплена в магазине и ставится в этот заказ. Если товар с таким названием уже есть, новый не создаётся.',
  'Məhsul adı': 'Название товара',
  'Alış ₼': 'Закупка ₼',
  'Satış ₼': 'Продажа ₼',
  'Ədəd': 'Шт.',
  'Mağaza (məcburi)': 'Магазин (обязательно)',
  'Nisyə alınıb': 'Куплено в долг',
  '— kreditor borcu yaranacaq': '— появится долг кредитору',
  '— kassadan çıxacaq': '— спишется из кассы',
  'Məhsul əlavə edilməyib.': 'Товары не добавлены.',
  'Bu sifarişdə satış qiyməti (₼)': 'Цена продажи в этом заказе (₼)',
  'Adı dəyişmək üçün klikləyin': 'Нажмите, чтобы изменить название',
  'Qiymət yalnız bu sifarişdə dəyişir. Miqdar artsa, fərq stokdan çıxılır; azalsa, stoka qayıdır. 0 yazsanız, sətir sifarişdən çıxır.':
    'Цена меняется только в этом заказе. Если количество увеличится, разница спишется со склада; если уменьшится, вернётся на склад. Если указать 0, строка уберётся из заказа.',
  'satış': 'продажа',
  'alış': 'закупка',
  'Müştəri gətirib': 'Принёс клиент',
  'Qaytar': 'Вернуть',
  'Müştəri neçə ədədi geri gətirib? Hissə stoka qayıdır, hesabatdan çıxılır; artıq ödənilmiş məbləğ kassadan qaytarılır.':
    'Сколько штук вернул клиент? Запчасть вернётся на склад и будет убрана из отчёта; уже оплаченная сумма вернётся из кассы.',
  'Qaytarışı qeyd et': 'Записать возврат',

  // Images & notes
  'Şəkillər': 'Фото',
  'Yüklənir...': 'Загрузка...',
  '+ Şəkil': '+ Фото',
  'Şəkil əlavə edilməyib.': 'Фото не добавлены.',
  'Şəkil': 'Фото',
  'Əlavə qeydlər': 'Дополнительные заметки',
  'Tövsiyə olunan işlər': 'Рекомендуемые работы',

  // Bill card
  'Hesab': 'Счёт',
  'Ümumi məbləğ': 'Общая сумма',
  'Ödənilib': 'Оплачен',
  'Qalıq': 'Остаток',
  'Xalis mənfəət': 'Чистая прибыль',

  // Info card
  'Müştəri': 'Клиент',
  'Nişan': 'Госномер',
  'təyin edilməyib': 'не назначен',
  'Tarix': 'Дата',
  'Təhvil': 'Выдача',
  'Yürüş': 'Пробег',
  'Zəmanət': 'Гарантия',
  'Dəyişmək üçün basın': 'Нажмите, чтобы изменить',
  'ZƏMANƏTLİ': 'С ГАРАНТИЕЙ',
  'ZƏMANƏTSİZ': 'БЕЗ ГАРАНТИИ',

  // Actions
  'Ödəniş qeyd et': 'Записать оплату',
  'Bu sifariş tam ödənilib və bağlanıb.': 'Этот заказ полностью оплачен и закрыт.',
  'Status dəyiş': 'Сменить статус',
  'Usta təyin et': 'Назначить мастера',
  'Hazırlanır...': 'Подготовка...',
  'Telefon nömrəsi yoxdur': 'Нет номера телефона',
  'Müştəri üçün sifariş linkini kopyala': 'Скопировать ссылку на заказ для клиента',
  'Kopyalandı': 'Скопировано',
  'Link': 'Ссылка',

  // Status dialog
  'Gözləyir': 'Ожидает',
  'İcrada': 'В работе',
  'Tamamlandı': 'Завершён',

  // Mechanic dialog
  'Təyin et': 'Назначить',
  'Seçilməyib': 'Не выбран',

  // WhatsApp dialog
  'Maşın hazırdır': 'Автомобиль готов',
  'Borc xatırlatması ({amount})': 'Напоминание о долге ({amount})',
  'Qaimə linki': 'Ссылка на накладную',
  'Mətnsiz yaz': 'Написать без текста',
  'WhatsApp mətnlə açılır — göndərməzdən əvvəl düzəldə bilərsiniz.': 'WhatsApp откроется с текстом — перед отправкой его можно изменить.',
  'Linki yenilə (köhnə link işləməyəcək)': 'Обновить ссылку (старая перестанет работать)',

  // Payment dialog
  'Ödəniş qeydi': 'Запись оплаты',
  'Sifariş tamamlandı': 'Заказ завершён',
  'Sonra': 'Позже',
  'Qeyd et': 'Записать',
  'Saxlanılır...': 'Сохранение...',
  'Endirimli qiymət': 'Цена со скидкой',
  'Yeni qiymət (endirimli)': 'Новая цена (со скидкой)',
  'Endirim məbləği': 'Сумма скидки',
  'Ödənilən məbləğ': 'Оплаченная сумма',
  'Borc': 'Долг',
  'Yarısı': 'Половина',
  'Tam': 'Полностью',
  'Borc qalır': 'Остаётся долг',
  'Tam ödənilib': 'Полностью оплачен',
}

export default ru
