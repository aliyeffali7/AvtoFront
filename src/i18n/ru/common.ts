import type { Dict } from '../index'

// Shared words used across many screens. Area files (orders.ts, finance.ts, …)
// hold the rest; if the same key appears twice, the later file wins.
const ru: Dict = {
  'Yadda saxla': 'Сохранить',
  'Ləğv et': 'Отмена',
  'Bağla': 'Закрыть',
  'Çıxış': 'Выход',
  'Geri': 'Назад',
  'Sil': 'Удалить',
  'Düzəlt': 'Изменить',
  'Əlavə et': 'Добавить',
  'Axtar': 'Поиск',
  'Yüklənir...': 'Загрузка...',
  'Dil': 'Язык',
  'Xəta baş verdi. Yenidən cəhd edin.': 'Произошла ошибка. Попробуйте ещё раз.',
  'Server vaxtında cavab vermədi. Yenidən cəhd edin.': 'Сервер не ответил вовремя. Попробуйте ещё раз.',
  'Bağlantı xətası. İnterneti yoxlayıb yenidən cəhd edin.': 'Ошибка соединения. Проверьте интернет и попробуйте ещё раз.',
  'Çox sayda sorğu göndərildi. Bir neçə saniyə gözləyib yenidən cəhd edin.':
    'Слишком много запросов. Подождите несколько секунд и попробуйте снова.',
  'Email və ya şifrə yanlışdır': 'Неверный email или пароль',
}

export default ru
