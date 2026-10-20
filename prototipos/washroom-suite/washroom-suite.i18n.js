/*
 * Washroom Suite Model: interface language and public mode, read from the page URL.
 *   ?lang=es|en|ru|uk  interface language (default en). The model itself is the same in every language.
 *   ?public=1          marks the public embed (data-public on <html>); every control stays available.
 * A classic script, run before the module, so the first paint is already in the right language.
 * Texts are keyed by their English original: elements marked data-i18n have their text nodes
 * translated, data-i18n-attr="aria-label title" translates those attributes. Missing entries stay English.
 */
(function () {
  var q = new URLSearchParams(location.search);
  var preset = window.WS_PRESET || {};          // direct-link pages set { lang, public } before this script
  var lang = (q.get('lang') || preset.lang || 'en').toLowerCase();
  if (!/^(es|en|ru|uk)$/.test(lang)) lang = 'en';
  var isPublic = q.get('public') === '1' || preset.public === true;

  var D = {
    es: {
      'Washroom Suite Model': 'Modelo de aseos',
      'Concept model': 'Modelo conceptual',
      'Washroom Suite': 'Aseos',
      "Laid out to the floor plan and finished to match the render. Every size is scaled from the plan's 960 mm dimension.":
        'Distribuido según el plano y acabado como en el render. Todas las medidas se escalan a partir de la cota de 960 mm del plano.',
      'What is interpreted': 'Qué es interpretación',
      'Heights: walls, fixtures and mirror sit at standard mounting heights': 'Alturas: paredes, sanitarios y espejo a alturas de montaje estándar',
      'Privacy screen, stone counters, mirror, dispensers and décor come from the render; the plan does not draw them':
        'La mampara, las encimeras de piedra, el espejo, los dispensadores y la decoración provienen del render; el plano no los dibuja',
      'Tile, stone and LED finishes, matched to the render by eye': 'Acabados de baldosa, piedra y LED, ajustados al render a ojo',
      'The other wall coverings, floor coverings and LED colours are options to compare; the render shows greige marble and warm white':
        'Los demás revestimientos de pared y suelo y colores LED son opciones para comparar; el render muestra mármol greige y blanco cálido',
      'Front wall thickness past the edge of the plan, assumed at 200 mm': 'Grosor del muro frontal más allá del borde del plano, supuesto en 200 mm',
      "Panel on the vestibule's left side and the strip along its front edge, read from thin lines on the plan":
        'Panel del lado izquierdo del vestíbulo y la tira de su borde frontal, leídos de líneas finas del plano',
      'Drag to orbit. Right-drag to pan. Scroll to zoom.': 'Arrastra para girar. Botón derecho para desplazar. Rueda para ampliar.',
      'Drag to orbit. Two fingers to pan and zoom.': 'Arrastra para girar. Dos dedos para desplazar y ampliar.',
      'Camera views': 'Vistas de cámara', 'Overview': 'Vista general', 'Plan': 'Planta', 'Vestibule': 'Vestíbulo', 'WC room': 'Aseo', 'Eye level': 'Altura de ojos',
      'Finishes': 'Acabados', 'Wall covering': 'Revestimiento de pared', 'Floor covering': 'Revestimiento de suelo', 'LED colour': 'Color LED',
      'Display options': 'Opciones de vista', 'Plan overlay': 'Superponer plano', 'Dimensions': 'Cotas', 'LED glow': 'Brillo LED', 'Turntable': 'Giro automático', 'Specification': 'Especificación',
      'Building the model': 'Construyendo el modelo', 'Laying tile and wiring the LED coves.': 'Colocando baldosas y conectando las tiras LED.',
      'The 3D view could not start': 'No se pudo iniciar la vista 3D',
      'This model needs WebGL. Open it in a current version of Chrome, Edge, Safari or Firefox.': 'Este modelo necesita WebGL. Ábrelo en una versión actual de Chrome, Edge, Safari o Firefox.',
      'Interactive 3D concept model of a washroom suite built to its floor plan: a hand-wash vestibule with a basin on a stone counter, and a WC room with a urinal, privacy screen, wall-hung toilet and a basin with a backlit mirror on the side wall.':
        'Modelo 3D conceptual interactivo de un conjunto de aseos construido según su plano: un vestíbulo con lavabo sobre encimera de piedra y un aseo con urinario, mampara, inodoro suspendido y lavabo con espejo retroiluminado en la pared lateral.',
      'from the plan': 'según el plano',
      'Greige marble': 'Mármol greige', 'White marble': 'Mármol blanco', 'Black marble': 'Mármol negro', 'Travertine': 'Travertino', 'Microcement': 'Microcemento',
      'Terrazzo': 'Terrazo', 'White subway tile': 'Azulejo metro blanco', 'Green zellige': 'Zellige verde', 'Oak slats': 'Listones de roble', 'Terracotta tile': 'Baldosa de terracota',
      'Charcoal stone': 'Piedra antracita', 'Grey porcelain': 'Porcelánico gris', 'Oak herringbone': 'Roble en espiga', 'Chequerboard': 'Damero', 'Grey mosaic': 'Mosaico gris',
      'Amber, 2200 K': 'Ámbar, 2200 K', 'Warm white, 2700 K': 'Blanco cálido, 2700 K', 'Neutral white, 4000 K': 'Blanco neutro, 4000 K', 'Cool white, 6500 K': 'Blanco frío, 6500 K', 'Blue': 'Azul', 'Pink': 'Rosa'
    },
    ru: {
      'Washroom Suite Model': 'Модель санузлов',
      'Concept model': 'Концепт-модель',
      'Washroom Suite': 'Санузлы',
      "Laid out to the floor plan and finished to match the render. Every size is scaled from the plan's 960 mm dimension.":
        'Планировка по плану, отделка по рендеру. Все размеры масштабированы от размера 960 мм на плане.',
      'What is interpreted': 'Что интерпретировано',
      'Heights: walls, fixtures and mirror sit at standard mounting heights': 'Высоты: стены, сантехника и зеркало — на стандартных монтажных высотах',
      'Privacy screen, stone counters, mirror, dispensers and décor come from the render; the plan does not draw them':
        'Перегородка, каменные столешницы, зеркало, диспенсеры и декор взяты из рендера; на плане их нет',
      'Tile, stone and LED finishes, matched to the render by eye': 'Плитка, камень и LED-подсветка подобраны по рендеру на глаз',
      'The other wall coverings, floor coverings and LED colours are options to compare; the render shows greige marble and warm white':
        'Остальные покрытия стен и пола и цвета LED — варианты для сравнения; на рендере мрамор грейдж и тёплый белый',
      'Front wall thickness past the edge of the plan, assumed at 200 mm': 'Толщина передней стены за краем плана принята 200 мм',
      "Panel on the vestibule's left side and the strip along its front edge, read from thin lines on the plan":
        'Панель слева в тамбуре и полоса вдоль его передней кромки прочитаны по тонким линиям плана',
      'Drag to orbit. Right-drag to pan. Scroll to zoom.': 'Перетащите для вращения. Правая кнопка — сдвиг. Колесо — масштаб.',
      'Drag to orbit. Two fingers to pan and zoom.': 'Перетащите для вращения. Двумя пальцами — сдвиг и масштаб.',
      'Camera views': 'Ракурсы камеры', 'Overview': 'Общий вид', 'Plan': 'План', 'Vestibule': 'Тамбур', 'WC room': 'Санузел', 'Eye level': 'На уровне глаз',
      'Finishes': 'Отделка', 'Wall covering': 'Покрытие стен', 'Floor covering': 'Покрытие пола', 'LED colour': 'Цвет LED',
      'Display options': 'Параметры отображения', 'Plan overlay': 'Наложить план', 'Dimensions': 'Размеры', 'LED glow': 'Свечение LED', 'Turntable': 'Автоповорот', 'Specification': 'Спецификация',
      'Building the model': 'Строим модель', 'Laying tile and wiring the LED coves.': 'Укладываем плитку и подключаем LED-подсветку.',
      'The 3D view could not start': 'Не удалось запустить 3D-вид',
      'This model needs WebGL. Open it in a current version of Chrome, Edge, Safari or Firefox.': 'Для модели нужен WebGL. Откройте её в актуальной версии Chrome, Edge, Safari или Firefox.',
      'Interactive 3D concept model of a washroom suite built to its floor plan: a hand-wash vestibule with a basin on a stone counter, and a WC room with a urinal, privacy screen, wall-hung toilet and a basin with a backlit mirror on the side wall.':
        'Интерактивная 3D концепт-модель санузлов по плану: тамбур с умывальником на каменной столешнице и санузел с писсуаром, перегородкой, подвесным унитазом и умывальником с зеркалом с подсветкой на боковой стене.',
      'from the plan': 'по плану',
      'Greige marble': 'Мрамор грейдж', 'White marble': 'Белый мрамор', 'Black marble': 'Чёрный мрамор', 'Travertine': 'Травертин', 'Microcement': 'Микроцемент',
      'Terrazzo': 'Терраццо', 'White subway tile': 'Белая плитка «кабанчик»', 'Green zellige': 'Зелёный зеллиж', 'Oak slats': 'Дубовые рейки', 'Terracotta tile': 'Терракотовая плитка',
      'Charcoal stone': 'Камень антрацит', 'Grey porcelain': 'Серый керамогранит', 'Oak herringbone': 'Дуб ёлочкой', 'Chequerboard': 'Шахматный узор', 'Grey mosaic': 'Серая мозаика',
      'Amber, 2200 K': 'Янтарный, 2200 K', 'Warm white, 2700 K': 'Тёплый белый, 2700 K', 'Neutral white, 4000 K': 'Нейтральный белый, 4000 K', 'Cool white, 6500 K': 'Холодный белый, 6500 K', 'Blue': 'Синий', 'Pink': 'Розовый'
    },
    uk: {
      'Washroom Suite Model': 'Модель санвузлів',
      'Concept model': 'Концепт-модель',
      'Washroom Suite': 'Санвузли',
      "Laid out to the floor plan and finished to match the render. Every size is scaled from the plan's 960 mm dimension.":
        'Планування за планом, оздоблення за рендером. Усі розміри масштабовано від розміру 960 мм на плані.',
      'What is interpreted': 'Що інтерпретовано',
      'Heights: walls, fixtures and mirror sit at standard mounting heights': 'Висоти: стіни, сантехніка й дзеркало — на стандартних монтажних висотах',
      'Privacy screen, stone counters, mirror, dispensers and décor come from the render; the plan does not draw them':
        "Перегородка, кам'яні стільниці, дзеркало, диспенсери й декор узяті з рендера; на плані їх немає",
      'Tile, stone and LED finishes, matched to the render by eye': 'Плитку, камінь і LED-підсвічування підібрано за рендером на око',
      'The other wall coverings, floor coverings and LED colours are options to compare; the render shows greige marble and warm white':
        'Інші покриття стін і підлоги та кольори LED — варіанти для порівняння; на рендері мармур грейдж і теплий білий',
      'Front wall thickness past the edge of the plan, assumed at 200 mm': 'Товщину передньої стіни за краєм плану прийнято 200 мм',
      "Panel on the vestibule's left side and the strip along its front edge, read from thin lines on the plan":
        'Панель ліворуч у тамбурі та смугу вздовж його переднього краю прочитано за тонкими лініями плану',
      'Drag to orbit. Right-drag to pan. Scroll to zoom.': 'Перетягніть для обертання. Права кнопка — зсув. Коліщатко — масштаб.',
      'Drag to orbit. Two fingers to pan and zoom.': 'Перетягніть для обертання. Двома пальцями — зсув і масштаб.',
      'Camera views': 'Ракурси камери', 'Overview': 'Загальний вигляд', 'Plan': 'План', 'Vestibule': 'Тамбур', 'WC room': 'Санвузол', 'Eye level': 'На рівні очей',
      'Finishes': 'Оздоблення', 'Wall covering': 'Покриття стін', 'Floor covering': 'Покриття підлоги', 'LED colour': 'Колір LED',
      'Display options': 'Параметри відображення', 'Plan overlay': 'Накласти план', 'Dimensions': 'Розміри', 'LED glow': 'Світіння LED', 'Turntable': 'Автоповорот', 'Specification': 'Специфікація',
      'Building the model': 'Будуємо модель', 'Laying tile and wiring the LED coves.': 'Укладаємо плитку й підключаємо LED-підсвічування.',
      'The 3D view could not start': 'Не вдалося запустити 3D-вигляд',
      'This model needs WebGL. Open it in a current version of Chrome, Edge, Safari or Firefox.': 'Для моделі потрібен WebGL. Відкрийте її в актуальній версії Chrome, Edge, Safari або Firefox.',
      'Interactive 3D concept model of a washroom suite built to its floor plan: a hand-wash vestibule with a basin on a stone counter, and a WC room with a urinal, privacy screen, wall-hung toilet and a basin with a backlit mirror on the side wall.':
        "Інтерактивна 3D концепт-модель санвузлів за планом: тамбур з умивальником на кам'яній стільниці та санвузол з пісуаром, перегородкою, підвісним унітазом і умивальником із дзеркалом з підсвічуванням на бічній стіні.",
      'from the plan': 'за планом',
      'Greige marble': 'Мармур грейдж', 'White marble': 'Білий мармур', 'Black marble': 'Чорний мармур', 'Travertine': 'Травертин', 'Microcement': 'Мікроцемент',
      'Terrazzo': 'Тераццо', 'White subway tile': 'Біла плитка «кабанчик»', 'Green zellige': 'Зелений зелліж', 'Oak slats': 'Дубові рейки', 'Terracotta tile': 'Теракотова плитка',
      'Charcoal stone': 'Камінь антрацит', 'Grey porcelain': 'Сірий керамограніт', 'Oak herringbone': 'Дуб ялинкою', 'Chequerboard': 'Шаховий візерунок', 'Grey mosaic': 'Сіра мозаїка',
      'Amber, 2200 K': 'Бурштиновий, 2200 K', 'Warm white, 2700 K': 'Теплий білий, 2700 K', 'Neutral white, 4000 K': 'Нейтральний білий, 4000 K', 'Cool white, 6500 K': 'Холодний білий, 6500 K', 'Blue': 'Синій', 'Pink': 'Рожевий'
    }
  };
  // the Specification panel
  var SPEC = {
 "es": {
  "Close specification": "Cerrar especificación",
  "Quantities from the model, scaled from the plan's 960 mm dimension; the ceiling height is assumed. Tile counts use the greige marble formats and 10% waste. Measure on site before ordering. No products or prices are specified.": "Cantidades del modelo, escaladas a partir de la cota de 960 mm del plano; la altura del techo es supuesta. Las baldosas se calculan con los formatos del mármol greige y un 10 % de merma. Mide en obra antes de pedir. No se especifican productos ni precios.",
  "Rooms": "Estancias",
  "mm": "mm",
  "Ceiling height": "Altura del techo",
  "(assumed)": "(supuesta)",
  "WC door": "Puerta del aseo",
  "Side panel": "Panel lateral",
  "LED strip": "Tira LED",
  "Top line, WC room": "Línea superior, aseo",
  "Top line, vestibule": "Línea superior, vestíbulo",
  "Floor line, WC room": "Línea de suelo, aseo",
  "Floor line, vestibule": "Línea de suelo, vestíbulo",
  "Under the vestibule counter": "Bajo la encimera del vestíbulo",
  "Strip, net": "Tira, neto",
  "To order, +10%": "A pedir, +10 %",
  "Backlit mirrors (integrated)": "Espejos retroiluminados (integrado)",
  "600 × 600 and 700 × 580": "600 × 600 y 700 × 580",
  "WC room, net of the door": "Aseo, sin la puerta",
  "Vestibule, net of door and panel": "Vestíbulo, sin puerta ni panel",
  "Door reveals": "Mochetas de la puerta",
  "Area to tile": "Superficie a alicatar",
  "Tiles at 600 × 1200": "Baldosas de 600 × 1200",
  "Floor area": "Superficie de suelo",
  "Under the door": "Bajo la puerta",
  "Tiles at 600 × 600": "Baldosas de 600 × 600",
  "Skirting, WC / vestibule": "Rodapié, aseo / vestíbulo",
  "Counters, basins and fixtures": "Encimeras, lavabos y sanitarios",
  "mm, heights above the floor": "mm, alturas sobre el suelo",
  "Both": "Ambos",
  "Counter": "Encimera",
  "Countertop basin": "Lavabo sobre encimera",
  "Deck tap": "Grifo de encimera",
  "Backlit mirror": "Espejo retroiluminado",
  "Towel dispenser": "Dispensador de toallas",
  "Side panel / door": "Panel lateral / puerta",
  "Wall spout": "Caño de pared",
  "Urinal, wall-hung": "Urinario suspendido",
  "Privacy screen": "Mampara",
  "Toilet, wall-hung": "Inodoro suspendido",
  "Flush plates": "Pulsadores",
  "Paper holder": "Portarrollos",
  "Door": "Puerta",
  "Threshold strip": "Tira de umbral",
  "Oval 500 × 290 × 130": "Ovalado 500 × 290 × 130",
  "Oval 330 × 500 × 130": "Ovalado 330 × 500 × 130",
  "Column ≈ 240, spout 140": "Columna ≈ 240, caño 140",
  "Projection 200": "Vuelo 200",
  "325 × 375 (plan)": "325 × 375 (plano)",
  "350 × 535 (plan)": "350 × 535 (plano)",
  "150 × 110, 250 × 160": "150 × 110, 250 × 160",
  "For 110 roll": "Para rollo de 110",
  "Wall-hung, full width, top at 860": "Suspendida, ancho completo, cara superior a 860",
  "Centre 480 from the left wall": "Centro a 480 de la pared izquierda",
  "Behind the bowl": "Detrás del lavabo",
  "Centre at 1550": "Centro a 1550",
  "Partition, centre at 1200": "Tabique, centro a 1200",
  "Left wall": "Pared izquierda",
  "Right wall, top at 860, centre 1500 from the back": "Pared derecha, cara superior a 860, centro a 1500 del fondo",
  "Centre 180 from the wall": "Centro a 180 de la pared",
  "At 1040": "A 1040",
  "1250 to 1850": "De 1250 a 1850",
  "Front wall, centre at 1200": "Pared frontal, centro a 1200",
  "Bowl 500 to ≈ 1080, centre 419 from the partition": "Cuerpo de 500 a ≈ 1080, centro a 419 del tabique",
  "305 to 1755, 790 from the partition": "De 305 a 1755, a 790 del tabique",
  "Seat ≈ 430, centre 1275 from the partition": "Asiento ≈ 430, centro a 1275 del tabique",
  "Urinal 1260 to 1370, toilet 960 to 1120": "Urinario de 1260 a 1370, inodoro de 960 a 1120",
  "At 700, 1560 from the partition": "A 700, a 1560 del tabique",
  "Partition": "Tabique",
  "Vestibule front": "Frente del vestíbulo",
  "Dark stone, grey veining": "Piedra oscura, veta gris",
  "White ceramic": "Cerámica blanca",
  "Matt black": "Negro mate",
  "Integrated LED": "LED integrado",
  "Stainless steel": "Acero inoxidable",
  "Beige, to confirm": "Beige, por confirmar",
  "Greige panel": "Panel greige",
  "Grey leaf, black frame": "Hoja gris, marco negro",
  "Brass, to confirm": "Latón, por confirmar"
 },
 "ru": {
  "Close specification": "Закрыть спецификацию",
  "Quantities from the model, scaled from the plan's 960 mm dimension; the ceiling height is assumed. Tile counts use the greige marble formats and 10% waste. Measure on site before ordering. No products or prices are specified.": "Объёмы из модели, масштабированы от размера 960 мм на плане; высота потолка принята. Плитка рассчитана по форматам мрамора грейдж с запасом 10 %. Перед заказом проверьте размеры на объекте. Изделия и цены не указаны.",
  "Rooms": "Помещения",
  "mm": "мм",
  "Ceiling height": "Высота потолка",
  "(assumed)": "(принята)",
  "WC door": "Дверь санузла",
  "Side panel": "Боковая панель",
  "LED strip": "LED-лента",
  "Top line, WC room": "Верхняя линия, санузел",
  "Top line, vestibule": "Верхняя линия, тамбур",
  "Floor line, WC room": "Нижняя линия, санузел",
  "Floor line, vestibule": "Нижняя линия, тамбур",
  "Under the vestibule counter": "Под столешницей в тамбуре",
  "Strip, net": "Лента, нетто",
  "To order, +10%": "К заказу, +10 %",
  "Backlit mirrors (integrated)": "Зеркала с подсветкой (встроенная)",
  "600 × 600 and 700 × 580": "600 × 600 и 700 × 580",
  "WC room, net of the door": "Санузел, за вычетом двери",
  "Vestibule, net of door and panel": "Тамбур, за вычетом двери и панели",
  "Door reveals": "Откосы двери",
  "Area to tile": "Площадь облицовки",
  "Tiles at 600 × 1200": "Плитка 600 × 1200",
  "Floor area": "Площадь пола",
  "Under the door": "Под дверью",
  "Tiles at 600 × 600": "Плитка 600 × 600",
  "Skirting, WC / vestibule": "Плинтус, санузел / тамбур",
  "Counters, basins and fixtures": "Столешницы, раковины и сантехника",
  "mm, heights above the floor": "мм, высоты от пола",
  "Both": "Оба",
  "Counter": "Столешница",
  "Countertop basin": "Накладная раковина",
  "Deck tap": "Смеситель на столешнице",
  "Backlit mirror": "Зеркало с подсветкой",
  "Towel dispenser": "Диспенсер полотенец",
  "Side panel / door": "Боковая панель / дверь",
  "Wall spout": "Настенный излив",
  "Urinal, wall-hung": "Подвесной писсуар",
  "Privacy screen": "Перегородка",
  "Toilet, wall-hung": "Подвесной унитаз",
  "Flush plates": "Кнопки смыва",
  "Paper holder": "Держатель бумаги",
  "Door": "Дверь",
  "Threshold strip": "Порожек",
  "Oval 500 × 290 × 130": "Овальная 500 × 290 × 130",
  "Oval 330 × 500 × 130": "Овальная 330 × 500 × 130",
  "Column ≈ 240, spout 140": "Корпус ≈ 240, излив 140",
  "Projection 200": "Вылет 200",
  "325 × 375 (plan)": "325 × 375 (план)",
  "350 × 535 (plan)": "350 × 535 (план)",
  "150 × 110, 250 × 160": "150 × 110, 250 × 160",
  "For 110 roll": "Для рулона 110",
  "Wall-hung, full width, top at 860": "Подвесная, на всю ширину, верх на 860",
  "Centre 480 from the left wall": "Центр в 480 от левой стены",
  "Behind the bowl": "За раковиной",
  "Centre at 1550": "Центр на 1550",
  "Partition, centre at 1200": "Перегородка, центр на 1200",
  "Left wall": "Левая стена",
  "Right wall, top at 860, centre 1500 from the back": "Правая стена, верх на 860, центр в 1500 от задней стены",
  "Centre 180 from the wall": "Центр в 180 от стены",
  "At 1040": "На 1040",
  "1250 to 1850": "От 1250 до 1850",
  "Front wall, centre at 1200": "Передняя стена, центр на 1200",
  "Bowl 500 to ≈ 1080, centre 419 from the partition": "Чаша от 500 до ≈ 1080, центр в 419 от перегородки",
  "305 to 1755, 790 from the partition": "От 305 до 1755, в 790 от перегородки",
  "Seat ≈ 430, centre 1275 from the partition": "Сиденье ≈ 430, центр в 1275 от перегородки",
  "Urinal 1260 to 1370, toilet 960 to 1120": "Писсуар 1260–1370, унитаз 960–1120",
  "At 700, 1560 from the partition": "На 700, в 1560 от перегородки",
  "Partition": "Перегородка",
  "Vestibule front": "Передняя кромка тамбура",
  "Dark stone, grey veining": "Тёмный камень, серые прожилки",
  "White ceramic": "Белая керамика",
  "Matt black": "Матовый чёрный",
  "Integrated LED": "Встроенная LED-подсветка",
  "Stainless steel": "Нержавеющая сталь",
  "Beige, to confirm": "Бежевый, уточнить",
  "Greige panel": "Панель грейдж",
  "Grey leaf, black frame": "Серое полотно, чёрная коробка",
  "Brass, to confirm": "Латунь, уточнить"
 },
 "uk": {
  "Close specification": "Закрити специфікацію",
  "Quantities from the model, scaled from the plan's 960 mm dimension; the ceiling height is assumed. Tile counts use the greige marble formats and 10% waste. Measure on site before ordering. No products or prices are specified.": "Обсяги з моделі, масштабовано від розміру 960 мм на плані; висоту стелі прийнято. Плитку розраховано за форматами мармуру грейдж із запасом 10 %. Перед замовленням перевірте розміри на об'єкті. Вироби й ціни не вказано.",
  "Rooms": "Приміщення",
  "mm": "мм",
  "Ceiling height": "Висота стелі",
  "(assumed)": "(прийнято)",
  "WC door": "Двері санвузла",
  "Side panel": "Бічна панель",
  "LED strip": "LED-стрічка",
  "Top line, WC room": "Верхня лінія, санвузол",
  "Top line, vestibule": "Верхня лінія, тамбур",
  "Floor line, WC room": "Нижня лінія, санвузол",
  "Floor line, vestibule": "Нижня лінія, тамбур",
  "Under the vestibule counter": "Під стільницею в тамбурі",
  "Strip, net": "Стрічка, нетто",
  "To order, +10%": "До замовлення, +10 %",
  "Backlit mirrors (integrated)": "Дзеркала з підсвічуванням (вбудоване)",
  "600 × 600 and 700 × 580": "600 × 600 і 700 × 580",
  "WC room, net of the door": "Санвузол, без дверей",
  "Vestibule, net of door and panel": "Тамбур, без дверей і панелі",
  "Door reveals": "Укоси дверей",
  "Area to tile": "Площа облицювання",
  "Tiles at 600 × 1200": "Плитка 600 × 1200",
  "Floor area": "Площа підлоги",
  "Under the door": "Під дверима",
  "Tiles at 600 × 600": "Плитка 600 × 600",
  "Skirting, WC / vestibule": "Плінтус, санвузол / тамбур",
  "Counters, basins and fixtures": "Стільниці, раковини й сантехніка",
  "mm, heights above the floor": "мм, висоти від підлоги",
  "Both": "Обидва",
  "Counter": "Стільниця",
  "Countertop basin": "Накладна раковина",
  "Deck tap": "Змішувач на стільниці",
  "Backlit mirror": "Дзеркало з підсвічуванням",
  "Towel dispenser": "Диспенсер рушників",
  "Side panel / door": "Бічна панель / двері",
  "Wall spout": "Настінний злив",
  "Urinal, wall-hung": "Підвісний пісуар",
  "Privacy screen": "Перегородка",
  "Toilet, wall-hung": "Підвісний унітаз",
  "Flush plates": "Кнопки змиву",
  "Paper holder": "Тримач паперу",
  "Door": "Двері",
  "Threshold strip": "Поріжок",
  "Oval 500 × 290 × 130": "Овальна 500 × 290 × 130",
  "Oval 330 × 500 × 130": "Овальна 330 × 500 × 130",
  "Column ≈ 240, spout 140": "Корпус ≈ 240, злив 140",
  "Projection 200": "Виліт 200",
  "325 × 375 (plan)": "325 × 375 (план)",
  "350 × 535 (plan)": "350 × 535 (план)",
  "150 × 110, 250 × 160": "150 × 110, 250 × 160",
  "For 110 roll": "Для рулону 110",
  "Wall-hung, full width, top at 860": "Підвісна, на всю ширину, верх на 860",
  "Centre 480 from the left wall": "Центр за 480 від лівої стіни",
  "Behind the bowl": "За раковиною",
  "Centre at 1550": "Центр на 1550",
  "Partition, centre at 1200": "Перегородка, центр на 1200",
  "Left wall": "Ліва стіна",
  "Right wall, top at 860, centre 1500 from the back": "Права стіна, верх на 860, центр за 1500 від задньої стіни",
  "Centre 180 from the wall": "Центр за 180 від стіни",
  "At 1040": "На 1040",
  "1250 to 1850": "Від 1250 до 1850",
  "Front wall, centre at 1200": "Передня стіна, центр на 1200",
  "Bowl 500 to ≈ 1080, centre 419 from the partition": "Чаша від 500 до ≈ 1080, центр за 419 від перегородки",
  "305 to 1755, 790 from the partition": "Від 305 до 1755, за 790 від перегородки",
  "Seat ≈ 430, centre 1275 from the partition": "Сидіння ≈ 430, центр за 1275 від перегородки",
  "Urinal 1260 to 1370, toilet 960 to 1120": "Пісуар 1260–1370, унітаз 960–1120",
  "At 700, 1560 from the partition": "На 700, за 1560 від перегородки",
  "Partition": "Перегородка",
  "Vestibule front": "Передній край тамбура",
  "Dark stone, grey veining": "Темний камінь, сірі прожилки",
  "White ceramic": "Біла кераміка",
  "Matt black": "Матовий чорний",
  "Integrated LED": "Вбудоване LED-підсвічування",
  "Stainless steel": "Нержавна сталь",
  "Beige, to confirm": "Бежевий, уточнити",
  "Greige panel": "Панель грейдж",
  "Grey leaf, black frame": "Сіре полотно, чорна коробка",
  "Brass, to confirm": "Латунь, уточнити"
 }
};
  var MORE = {"es": {"Round, Ø 600": "Redondo, Ø 600", "2 × round, Ø 600": "2 × redondos, Ø 600", "Finishes": "Acabados"}, "ru": {"Round, Ø 600": "Круглое, Ø 600", "2 × round, Ø 600": "2 × круглых, Ø 600", "Finishes": "Отделка"}, "uk": {"Round, Ø 600": "Кругле, Ø 600", "2 × round, Ø 600": "2 × круглих, Ø 600", "Finishes": "Оздоблення"}};
  Object.keys(MORE).forEach(function (l) { for (var k in MORE[l]) D[l][k] = MORE[l][k]; });
  var SVC = {"es": {"Electrics": "Electricidad", "Water": "Agua", "Drainage": "Saneamiento", "Downlight": "Foco empotrado", "Recessed, LED 2700 K": "Empotrado, LED 2700 K", "Ceiling speaker": "Altavoz de techo", "Sound system": "Sistema de sonido", "LED strip feed": "Alimentación tira LED", "Wall LED, 2700 K": "LED de pared, 2700 K", "Mirror LED feed": "Alimentación LED del espejo", "Behind the mirror": "Detrás del espejo", "Cold water": "Agua fría", "Hot water": "Agua caliente", "Basin": "Lavabo", "Basin, wall mixer": "Lavabo, grifo de pared", "Toilet cistern": "Cisterna del inodoro", "Urinal flush": "Descarga del urinario", "Waste Ø 50": "Desagüe Ø 50", "Waste Ø 110": "Desagüe Ø 110", "Urinal": "Urinario", "Toilet": "Inodoro", "Services": "Instalaciones", "electrics per plan, water and drainage schematic": "electricidad según plano; agua y saneamiento esquemáticos", "Height": "Altura", "Waste bin, lidded": "Papelera con tapa", "Under the counter, left of the basin": "Bajo la encimera, a la izquierda del lavabo", "Under the counter, beside the basin": "Bajo la encimera, junto al lavabo", "Print selected configuration": "Imprimir la configuración elegida", "Selected configuration": "Configuración elegida", "Services shown": "Instalaciones visibles"}, "ru": {"Electrics": "Электрика", "Water": "Вода", "Drainage": "Канализация", "Downlight": "Точечный светильник", "Recessed, LED 2700 K": "Встраиваемый, LED 2700 K", "Ceiling speaker": "Потолочный динамик", "Sound system": "Звуковая система", "LED strip feed": "Вывод для LED-ленты", "Wall LED, 2700 K": "Настенная LED, 2700 K", "Mirror LED feed": "Вывод для подсветки зеркала", "Behind the mirror": "За зеркалом", "Cold water": "Холодная вода", "Hot water": "Горячая вода", "Basin": "Раковина", "Basin, wall mixer": "Раковина, настенный смеситель", "Toilet cistern": "Бачок унитаза", "Urinal flush": "Смыв писсуара", "Waste Ø 50": "Канализация Ø 50", "Waste Ø 110": "Канализация Ø 110", "Urinal": "Писсуар", "Toilet": "Унитаз", "Services": "Инженерные сети", "electrics per plan, water and drainage schematic": "электрика по плану; вода и канализация схематично", "Height": "Высота", "Waste bin, lidded": "Урна с крышкой", "Under the counter, left of the basin": "Под столешницей, слева от раковины", "Under the counter, beside the basin": "Под столешницей, рядом с раковиной", "Print selected configuration": "Распечатать выбранную конфигурацию", "Selected configuration": "Выбранная конфигурация", "Services shown": "Показанные сети"}, "uk": {"Electrics": "Електрика", "Water": "Вода", "Drainage": "Каналізація", "Downlight": "Точковий світильник", "Recessed, LED 2700 K": "Вбудований, LED 2700 K", "Ceiling speaker": "Стельовий динамік", "Sound system": "Звукова система", "LED strip feed": "Вивід для LED-стрічки", "Wall LED, 2700 K": "Настінна LED, 2700 K", "Mirror LED feed": "Вивід для підсвічування дзеркала", "Behind the mirror": "За дзеркалом", "Cold water": "Холодна вода", "Hot water": "Гаряча вода", "Basin": "Раковина", "Basin, wall mixer": "Раковина, настінний змішувач", "Toilet cistern": "Бачок унітаза", "Urinal flush": "Змив пісуара", "Waste Ø 50": "Каналізація Ø 50", "Waste Ø 110": "Каналізація Ø 110", "Urinal": "Пісуар", "Toilet": "Унітаз", "Services": "Інженерні мережі", "electrics per plan, water and drainage schematic": "електрика за планом; вода й каналізація схематично", "Height": "Висота", "Waste bin, lidded": "Урна з кришкою", "Under the counter, left of the basin": "Під стільницею, ліворуч від раковини", "Under the counter, beside the basin": "Під стільницею, поруч із раковиною", "Print selected configuration": "Роздрукувати вибрану конфігурацію", "Selected configuration": "Вибрана конфігурація", "Services shown": "Показані мережі"}};
  Object.keys(SVC).forEach(function (l) { for (var k in SVC[l]) D[l][k] = SVC[l][k]; });
  Object.keys(SPEC).forEach(function (l) { for (var k in SPEC[l]) D[l][k] = SPEC[l][k]; });
  var dict = D[lang] || {};
  function tr(s) { var k = String(s).trim(); return Object.prototype.hasOwnProperty.call(dict, k) ? dict[k] : s; }

  function apply(rootEl) {
    var els = (rootEl || document).querySelectorAll('[data-i18n], [data-i18n-attr]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-i18n')) {
        for (var n = el.firstChild; n; n = n.nextSibling) {
          if (n.nodeType === 3 && n.nodeValue.trim()) {
            var lead = n.nodeValue.match(/^\s*/)[0], trail = n.nodeValue.match(/\s*$/)[0];
            n.nodeValue = lead + tr(n.nodeValue) + trail;
          }
        }
      }
      var attrs = (el.getAttribute('data-i18n-attr') || '').split(/\s+/).filter(Boolean);
      for (var a = 0; a < attrs.length; a++) if (el.hasAttribute(attrs[a])) el.setAttribute(attrs[a], tr(el.getAttribute(attrs[a])));
    }
  }

  document.documentElement.lang = lang;
  document.title = tr(document.title);
  apply(document);
  if (isPublic) document.documentElement.setAttribute('data-public', '');
  window.WS = { lang: lang, isPublic: isPublic, tr: tr };
})();
