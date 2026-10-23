import type { Dict } from '../index'

// Loaded last (files merge in name order): settles keys that two area files
// translated differently, so the same Azerbaijani word reads the same
// everywhere. Context variants (`key@@ctx`) cover genuinely different meanings.
const ru: Dict = {
  'Ləğv et': 'Отмена',
  'Ləğv et@@action': 'Отменить',
  'Hesab': 'Аккаунт',
  'Hesab@@order': 'Счёт',
  'Tam': 'Полностью',
  'Ədəd': 'Кол-во',
  'Ödə': 'Оплатить',
  'Deaktiv': 'Неактивен',
  'Tarix seç': 'Выбрать дату',
  'stokda yoxdur': 'нет в наличии',
  'İş qeyd edilməyib.': 'Работы не указаны.',
  '— kreditor borcu yaranacaq': '— возникнет долг перед поставщиком',
  'Yarımçıq qalmış qaralama bərpa edildi.': 'Восстановлен несохранённый черновик.',
  'Usta payı işin qiymətindən çox ola bilməz.': 'Доля мастера не может превышать стоимость работы.',
  'Fayl ölçüsü 5 MB-dan çox ola bilməz.': 'Размер файла не должен превышать 5 МБ.',
  'Çox sayda sorğu göndərildi. Bir neçə saniyə gözləyib yenidən cəhd edin.':
    'Слишком много запросов. Подождите несколько секунд и попробуйте ещё раз.',
}

export default ru
