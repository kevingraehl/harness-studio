/* UI-only translations. Never translate project data, SVG, input values or option values. */
(() => {
  'use strict';
  const rows = `
↖ Select|↖ Выбор|↖ 选择|↖ Seleccionar
⌁ Wire|⌁ Провод|⌁ 导线|⌁ Cable
▦ Connector|▦ Разъём|▦ 连接器|▦ Conector
▭ Device|▭ Устройство|▭ 设备|▭ Dispositivo
▱ Loom|▱ Жгут|▱ 线束|▱ Mazo
Fit|Вписать|适应画布|Ajustar vista
Show grid|Показать сетку|显示网格|Mostrar cuadrícula
Hide grid|Скрыть сетку|隐藏网格|Ocultar cuadrícula
Snap: on|Привязка: вкл.|吸附：开|Ajuste: sí
Snap: off|Привязка: выкл.|吸附：关|Ajuste: no
Bundle view|Вид жгутов|线束视图|Vista de mazos
New|Новый|新建|Nuevo
Save|Сохранить|保存|Guardar
Export|Экспорт|导出|Exportar
Import|Импорт|导入|Importar
Library|Библиотека|元件库|Biblioteca
Project|Проект|项目|Proyecto
Public preview|Публичная версия|公开预览版|Vista previa pública
Battery|Аккумулятор|电池|Batería
Controller|Контроллер|控制器|Controlador
Converter|Преобразователь|转换器|Convertidor
Motor|Двигатель|电机|Motor
Display|Дисплей|显示屏|Pantalla
Ground|Масса|接地|Masa
SPST key|Ключ SPST|SPST 钥匙开关|Llave SPST
Kickstand|Подножка|侧支架|Pata lateral
Hall throttle|Газ: датчик Холла|霍尔油门|Acelerador Hall
5 kΩ pot|Потенциометр 5 кОм|5 kΩ 电位器|Potenciómetro 5 kΩ
.250 spade|Клемма .250|.250 插片端子|Terminal .250
Bullet|Круглая клемма|子弹头端子|Terminal bala
Smart 90° routing|Умная трассировка 90°|智能直角布线|Trazado inteligente a 90°
Readable — fewer crossings|Читаемость — меньше пересечений|易读：减少交叉|Legible — menos cruces
Shorter paths|Кратчайшие пути|更短路径|Recorridos más cortos
Fewer bends|Меньше изгибов|减少拐弯|Menos codos
Strict — no wire conflicts|Строго — без конфликтов|严格：无导线冲突|Estricto — sin conflictos
Route wires|Проложить провода|自动布线|Trazar cables
Try another route|Другой вариант|尝试其他路径|Probar otra ruta
Compact layout|Компактная компоновка|紧凑布局|Diseño compacto
Compact rows|Компактные ряды|紧凑行布局|Filas compactas
Tall columns|Вертикальные колонки|纵向列布局|Columnas verticales
Controller centered|Контроллер в центре|控制器居中|Controlador centrado
Arrange all|Разместить всё|排列全部|Organizar todo
I'm feeling lucky|Мне повезёт|试试手气|Voy a tener suerte
Group name|Название группы|组名|Nombre del grupo
Group boxes|Сгруппировать блоки|组合方框|Agrupar bloques
Bundle wires|Объединить в жгут|合并为线束|Agrupar cables
Ungroup|Разгруппировать|取消组合|Desagrupar
Clean schematic|Упорядочить схему|整理原理图|Ordenar esquema
Restore original|Восстановить исходное|恢复原始版本|Restaurar original
Name|Название|名称|Nombre
Notes|Примечания|备注|Notas
Canvas background|Фон холста|画布背景|Fondo del lienzo
White canvas|Белый фон|白色画布|Fondo blanco
Black canvas|Чёрный фон|黑色画布|Fondo negro
Light Bee starter|Шаблон Light Bee|Light Bee 模板|Plantilla Light Bee
Quick use|Краткая инструкция|快速入门|Guía rápida
Add connectors or devices.|Добавьте разъёмы или устройства.|添加连接器或设备。|Añade conectores o dispositivos.
Select|Выберите|选择|Selecciona
Wire|Провод|导线|Cable
, then click two pin circles.|, затем нажмите на два контакта.|，然后点击两个引脚圆点。|, luego haz clic en dos contactos.
Select anything to edit it at right.|Выберите объект для редактирования справа.|选择对象后在右侧编辑。|Selecciona un elemento para editarlo a la derecha.
Drag the canvas to pan; wheel to zoom.|Перетаскивайте холст; колесо меняет масштаб.|拖动画布平移，滚轮缩放。|Arrastra el lienzo; usa la rueda para ampliar.
Select mode|Режим выбора|选择模式|Modo selección
Wire mode|Режим проводов|布线模式|Modo cable
Build the harness from the outside in.|Начните с компонентов жгута.|从元件开始搭建线束。|Empieza por los componentes del mazo.
Add a connector, battery, controller, or loom from the toolbars.|Добавьте разъём, аккумулятор, контроллер или жгут с панели.|从工具栏添加连接器、电池、控制器或线束。|Añade conectores, baterías, controladores o mazos desde las barras.
Load 2023 Light Bee X starter map|Загрузить шаблон Light Bee X 2023|加载 2023 Light Bee X 模板|Cargar plantilla Light Bee X 2023
Inspector|Свойства|属性面板|Propiedades
Nothing selected|Ничего не выбрано|未选择对象|Nada seleccionado
Delete|Удалить|删除|Eliminar
Select a connector, device, wire, loom, or pin to edit its properties.|Выберите разъём, устройство, провод, жгут или контакт для редактирования.|选择连接器、设备、导线、线束或引脚以编辑属性。|Selecciona un conector, dispositivo, cable, mazo o contacto para editarlo.
Ready|Готово|就绪|Listo
Add connector|Добавить разъём|添加连接器|Añadir conector
Connector name|Название разъёма|连接器名称|Nombre del conector
Positions|Число контактов|位数|Posiciones
Columns|Колонки|列数|Columnas
Housing gender|Тип контактов корпуса|壳体端子性别|Género del conector
Gender|Тип контактов|端子性别|Género
View|Вид|视角|Vista
Manufacturer|Производитель|制造商|Fabricante
Family|Серия|系列|Familia
Ordering code|Код заказа|订货编号|Código de pedido
Terminal series|Серия клемм|端子系列|Serie de terminales
Housing color|Цвет корпуса|壳体颜色|Color de carcasa
Cancel|Отмена|取消|Cancelar
Add device|Добавить устройство|添加设备|Añadir dispositivo
Type|Тип|类型|Tipo
Fill|Заливка|填充色|Relleno
Width|Ширина|宽度|Ancho
Height|Высота|高度|Alto
Add loom / bundle outline|Добавить контур жгута|添加线束轮廓|Añadir contorno del mazo
Outline color|Цвет контура|轮廓颜色|Color del contorno
Add loom|Добавить жгут|添加线束|Añadir mazo
Generic box|Обычный блок|通用方框|Bloque genérico
DC/DC converter|Преобразователь DC/DC|DC/DC 转换器|Convertidor CC/CC
Dashboard/display|Панель / дисплей|仪表/显示屏|Panel/pantalla
SPST switch / ignition key|Выключатель SPST / ключ зажигания|SPST 开关/点火钥匙|Interruptor SPST / llave
Kickstand safety switch|Выключатель подножки|侧支架安全开关|Interruptor de pata lateral
Three-wire throttle|Трёхпроводная ручка газа|三线油门|Acelerador de tres cables
0.250 in spade terminal|Плоская клемма 0,250 дюйма|0.250 英寸插片端子|Terminal plano de 0,250 pulgadas
Inline bullet connector|Круглый линейный разъём|直通子弹头连接器|Conector bala en línea
female|гнездо|母端|hembra
male|штырь|公端|macho
unknown|неизвестно|未知|desconocido
mating face|со стороны контактов|配合面|cara de acoplamiento
wire side|со стороны проводов|进线侧|lado de cables
Appearance|Внешний вид|外观|Apariencia
simple|простой|简洁|simple
illustrated|с рисунком|图示|ilustrada
Throttle sensor|Датчик газа|油门传感器|Sensor de acelerador
Hall effect|Эффект Холла|霍尔效应|Efecto Hall
Potentiometer|Потенциометр|电位器|Potenciómetro
Unknown|Неизвестно|未知|Desconocido
Resistance (ohms)|Сопротивление (Ом)|电阻（欧姆）|Resistencia (ohmios)
Part number|Артикул|零件编号|Número de pieza
Shape|Форма|形状|Forma
rounded|скруглённая|圆角矩形|redondeada
square|квадрат|正方形|cuadrada
circle|круг|圆形|círculo
triangle|треугольник|三角形|triángulo
diamond|ромб|菱形|rombo
hexagon|шестиугольник|六边形|hexágono
custom|своя|自定义|personalizada
Draw custom outline|Нарисовать контур|绘制自定义轮廓|Dibujar contorno
Custom polygon points (%)|Точки многоугольника (%)|多边形顶点（%）|Vértices del polígono (%)
Pin alignment|Расположение контактов|引脚排列|Alineación de contactos
Align pins|Выровнять контакты|排列引脚|Alinear contactos
Apply to all|Применить ко всем|应用到全部|Aplicar a todos
manual|вручную|手动|manual
top|сверху|顶部|arriba
right|справа|右侧|derecha
bottom|снизу|底部|abajo
left|слева|左侧|izquierda
auto|автоматически|自动|automático
free|свободно|自由|libre
Pins · drag to reorder|Контакты · перетащите для сортировки|引脚 · 拖动排序|Contactos · arrastra para ordenar
Connection points · drag to reorder|Точки подключения · перетащите для сортировки|连接点 · 拖动排序|Puntos de conexión · arrastra para ordenar
Edit|Изменить|编辑|Editar
Add position|Добавить контакт|添加引脚位|Añadir posición
Add terminal|Добавить клемму|添加端子|Añadir terminal
Remove last|Удалить последний|删除最后一个|Eliminar último
Endpoints|Концы провода|端点|Extremos
Circuit / label|Цепь / метка|电路/标签|Circuito / etiqueta
Harness group|Группа жгута|线束组|Grupo de mazo
Base color|Основной цвет|主色|Color base
Tracer color|Цвет полосы|条纹色|Color de franja
No tracer|Без полосы|无条纹|Sin franja
Gauge (AWG)|Сечение (AWG)|线规（AWG）|Calibre (AWG)
Displayed thickness|Толщина на схеме|显示粗细|Grosor visual
Physical length|Физическая длина|实际长度|Longitud física
Unit|Единица|单位|Unidad
Line style|Стиль линии|线型|Estilo de línea
solid|сплошная|实线|continua
dashed|штриховая|虚线|discontinua
Outline thickness|Толщина контура|轮廓粗细|Grosor del contorno
Move enclosed items with this group|Перемещать вложенные объекты вместе|随组移动内部对象|Mover elementos interiores con el grupo
Pin / cavity number|Номер контакта / гнезда|引脚/腔位编号|Número de contacto / cavidad
Function / net name|Функция / имя цепи|功能/网络名称|Función / nombre de red
Electrical type|Электрический тип|电气类型|Tipo eléctrico
Terminal gender|Тип контакта|端子性别|Género del terminal
Terminal / contact|Клемма / контакт|端子/接点|Terminal / contacto
Placement|Расположение|位置|Ubicación
X offset|Смещение X|X 偏移|Desplazamiento X
Y offset|Смещение Y|Y 偏移|Desplazamiento Y
Observed wire color|Наблюдаемый цвет провода|观察到的线色|Color observado del cable
Back to connector|Назад к разъёму|返回连接器|Volver al conector
signal|сигнал|信号|señal
power|питание|电源|alimentación
ground|масса|接地|masa
shield|экран|屏蔽|blindaje
socket|гнездо|插孔|hembra
blade|плоский контакт|插片|cuchilla
bullet|круглый контакт|子弹头|bala
ring|кольцо|环形|anillo
spade|плоская клемма|插片端子|plano
solder|пайка|焊接|soldadura
other|другое|其他|otro
box|блок|方框|bloque
battery|аккумулятор|电池|batería
controller|контроллер|控制器|controlador
converter|преобразователь|转换器|convertidor
motor|двигатель|电机|motor
display|дисплей|显示屏|pantalla
kickstand|подножка|侧支架|pata lateral
throttle|ручка газа|油门|acelerador
pot|потенциометр|电位器|potenciómetro
Routing|Трассировка|布线路径|Trazado
curved|кривая|曲线|curvo
orthogonal|прямоугольная|直角|ortogonal
straight|прямая|直线|recto
Reset bends|Сбросить изгибы|重置拐点|Restablecer codos
Open at start (%)|Открыто в начале (%)|起始裸露比例（%）|Expuesto al inicio (%)
Open at end (%)|Открыто в конце (%)|末端裸露比例（%）|Expuesto al final (%)
Loom thickness|Толщина жгута|线束粗细|Grosor del mazo
Reset automatic route|Сбросить маршрут|重置自动路径|Restablecer ruta automática
Conductors|Проводники|导体|Conductores
Reference images|Изображения|参考图片|Imágenes de referencia
Wire exit length (drawing units)|Длина выхода (единицы схемы)|出线长度（绘图单位）|Longitud de salida (unidades de dibujo)
Apply to selected wire exits|Применить к выбранным выходам|应用到所选出线|Aplicar a las salidas seleccionadas
Clear selection|Снять выделение|清除选择|Quitar selección
Saved in this browser|Сохранено в этом браузере|已保存在此浏览器|Guardado en este navegador
Project JSON exported|Проект JSON экспортирован|项目 JSON 已导出|Proyecto JSON exportado
SVG exported|SVG экспортирован|SVG 已导出|SVG exportado
Project imported|Проект импортирован|项目已导入|Proyecto importado
Choose destination pin|Выберите конечный контакт|选择目标引脚|Elige el contacto de destino
Add components first|Сначала добавьте компоненты|请先添加元件|Añade componentes primero
Add wires first|Сначала добавьте провода|请先添加导线|Añade cables primero
Close|Закрыть|关闭|Cerrar
Function|Функция|功能|Función
Drag to reorder|Перетащите для сортировки|拖动排序|Arrastra para ordenar
Restore original project?|Восстановить исходный проект?|恢复原始项目？|¿Restaurar el proyecto original?
Edits made after cleanup will be discarded.|Изменения после упорядочивания будут потеряны.|整理后的修改将被丢弃。|Se perderán los cambios posteriores a la limpieza.
Light Bee starter map loaded|Шаблон Light Bee загружен|已加载 Light Bee 模板|Plantilla Light Bee cargada
select|выбор|选择|seleccionar
wire|провод|导线|cable
delete|удалить|删除|eliminar
pan|перемещение|平移|desplazar
undo|отмена|撤销|deshacer
Select / move (V)|Выбор / перемещение (V)|选择/移动（V）|Seleccionar / mover (V)
Connect two pins (W)|Соединить два контакта (W)|连接两个引脚（W）|Conectar dos contactos (W)
Add connector (C)|Добавить разъём (C)|添加连接器（C）|Añadir conector (C)
Add device or battery (B)|Добавить устройство или аккумулятор (B)|添加设备或电池（B）|Añadir dispositivo o batería (B)
Add loom outline (L)|Добавить контур жгута (L)|添加线束轮廓（L）|Añadir contorno del mazo (L)
Undo (⌘Z)|Отменить (⌘Z)|撤销（⌘Z）|Deshacer (⌘Z)
Redo (⇧⌘Z)|Повторить (⇧⌘Z)|重做（⇧⌘Z）|Rehacer (⇧⌘Z)
Fit drawing (F)|Вписать схему (F)|适应画布（F）|Ajustar dibujo (F)
Show or hide grid lines|Показать или скрыть сетку|显示或隐藏网格|Mostrar u ocultar cuadrícula
Snap positions independently of grid visibility|Привязка независимо от видимости сетки|吸附与网格显示独立设置|Ajuste independiente de la visibilidad de la cuadrícula
Collapse named wire groups into loom trunks|Свернуть группы проводов в жгуты|将命名导线组折叠为线束主干|Contraer grupos de cables en mazos
Arrange components and route wires around boxes|Разместить компоненты и обойти блоки проводами|排列元件并绕开方框布线|Organizar componentes y evitar bloques
Restore the project saved before cleanup|Восстановить проект до упорядочивания|恢复整理前的项目|Restaurar el proyecto anterior a la limpieza
Bike year, revision, measurement conditions…|Год, версия, условия измерений…|车型年份、版本、测量条件…|Año, revisión, condiciones de medición…
e.g. Furukawa|например Furukawa|例如 Furukawa|p. ej. Furukawa
e.g. FW-C|например FW-C|例如 FW-C|p. ej. FW-C
e.g. FW-C-6M-B|например FW-C-6M-B|例如 FW-C-6M-B|p. ej. FW-C-6M-B
e.g. 2.3 mm (verify)|например 2,3 мм (проверить)|例如 2.3 mm（需核实）|p. ej. 2,3 mm (verificar)
`;
  const table = new Map(rows.trim().split('\n').map(row => {
    const parts=row.split('|'); if(parts.length!==4) throw new Error('Invalid translation row');
    return [parts[0], {en:parts[0],ru:parts[1],'zh-CN':parts[2],es:parts[3]}];
  }));
  const paragraphs = [
    ['Saved on this browser only. Export a backup or send your JSON to share a drawing. Starter maps are provisional, not verified service diagrams. Private reference photos are not published. Best on desktop.','Сохранение только в этом браузере. Экспортируйте резервную копию или отправьте JSON для обмена схемой. Шаблоны предварительные, не проверенные сервисные схемы. Частные фотографии не опубликованы. Лучше работать на компьютере.','仅保存在此浏览器。请导出备份，或发送 JSON 分享图纸。模板为待核实资料，并非经过验证的维修电路图。私人参考照片未公开。建议在电脑上使用。','Se guarda solo en este navegador. Exporta una copia o envía el JSON para compartir. Las plantillas son provisionales, no esquemas de servicio verificados. Las fotos privadas no están publicadas. Mejor en ordenador.'],
    ['The private photo archive is not included in this public edition. Existing photo references remain in your project export.','Частный фотоархив не включён в публичную версию. Ссылки на фотографии сохраняются при экспорте проекта.','公开版不包含私人照片库。现有照片引用仍保留在导出的项目中。','El archivo privado de fotos no está incluido. Las referencias existentes se conservan al exportar el proyecto.'],
    ['Keeps boxes and pins fixed. Expands bundles to show individual wires; bundle membership stays saved. Undo restores your previous routes.','Блоки и контакты остаются на месте. Жгуты раскрываются; состав сохраняется. Отмена возвращает прежние маршруты.','保持方框和引脚位置不变。展开线束显示各条导线，保留分组。撤销可恢复原路径。','Mantiene bloques y contactos fijos. Expande los mazos sin perder sus grupos. Deshacer restaura las rutas anteriores.'],
    ['Routing results will show crossings, overlaps, and bends here.','Здесь появятся пересечения, наложения и изгибы.','此处显示交叉、重叠和拐弯结果。','Aquí aparecerán cruces, solapamientos y codos.'],
    ['Moves every component and redraws bundles. Keeps Bundle view. Each lucky click tries another arrangement. Undo restores the previous one.','Перемещает все компоненты и перерисовывает жгуты. Вид жгутов сохраняется. Каждый случайный вариант меняет компоновку. Отмена возвращает предыдущую.','移动全部元件并重绘线束，保留线束视图。每次试手气生成另一布局。撤销可恢复。','Mueve todos los componentes y redibuja los mazos. Conserva su vista. Cada intento ofrece otra distribución. Deshacer restaura la anterior.'],
    ['Command/Ctrl-click or drag-select first. Group boxes moves them together; Bundle wires combines selected wires. Ungroup preserves all components and wires.','Сначала выделите с Command/Ctrl. Группа блоков перемещается вместе; группа проводов образует жгут. Разгруппировка сохраняет объекты.','先按 Command/Ctrl 点击或框选。组合方框后可一起移动；合并导线可形成线束。取消组合不会删除元件或导线。','Primero selecciona con Command/Ctrl o arrastrando. Agrupar bloques permite moverlos juntos; agrupar cables crea un mazo. Desagrupar conserva todo.'],
    ['Auto-arrange boxes and right-angle wires. Original project is backed up. Crossings are not junctions.','Автоматическая компоновка с прямыми углами. Исходный проект сохраняется. Пересечения не означают соединение.','自动排列方框和直角导线，并备份原始项目。交叉不表示电气连接。','Organiza bloques y cables a 90°. Guarda una copia del original. Los cruces no son conexiones.'],
    ['Best visibility: dark canvas + grid for pale wires; white canvas + grid for printed schematics. Wire contrast halos stay automatic.','Для светлых проводов используйте тёмный фон с сеткой; для печати — белый. Контрастная обводка автоматическая.','浅色导线建议使用深色画布加网格；打印建议白色画布。导线自动添加对比轮廓。','Para cables claros, fondo oscuro con cuadrícula; para imprimir, fondo blanco. El contraste de los cables es automático.'],
    ['Use Manual for a mixture. Edit an individual pin below to override its side or use freeform X/Y placement.','Для смешанного размещения выберите ручной режим. Ниже можно изменить сторону или координаты X/Y каждого контакта.','混合排列请选择手动。可在下方单独编辑引脚所在边或自由 X/Y 位置。','Usa Manual para combinar lados. Edita cada contacto para cambiar su lado o su posición X/Y.'],
    ['Give multiple wires the same group name, then turn on Bundle view.','Задайте проводам одинаковое имя группы и включите вид жгутов.','给多条导线设置相同组名，再开启线束视图。','Asigna el mismo grupo a varios cables y activa la vista de mazos.'],
    ['When enabled, moving this outline also moves every box fully enclosed by it.','При включении контур перемещает все полностью заключённые в нём блоки.','启用后，移动轮廓会同时移动其中完全包围的方框。','Al activarlo, el contorno mueve los bloques totalmente encerrados.'],
    ['Set either exposed end from 0–100%. If their sum exceeds 100%, the other end is reduced. Defaults: 10% each.','Открытые концы: 0–100%. При сумме более 100% другой конец сокращается. По умолчанию по 10%.','两端裸露比例可设为 0–100%。总和超过 100% 时会缩短另一端。默认各 10%。','Cada extremo admite 0–100%. Si la suma supera 100%, se reduce el otro extremo. Valor inicial: 10% cada uno.'],
    ['Grab anywhere on the trunk and drag to create a turn. Shift-drag moves the whole route. Orange handles reshape bends; Alt-click removes a bend. Colored branches can be grabbed and bent independently.','Перетаскивайте ствол для создания поворота. Shift перемещает весь маршрут. Оранжевые точки меняют изгибы; Alt-клик удаляет. Цветные ветви редактируются отдельно.','拖动主干任意位置可创建拐点。Shift 拖动整条路径。橙色手柄调整拐点，Alt 点击删除。彩色分支可单独调整。','Arrastra el tronco para crear un codo. Mayús mueve toda la ruta. Los controles naranjas ajustan codos; Alt-clic los elimina. Las ramas se ajustan por separado.'],
    ['Drag the line to move its bends; endpoints stay attached. Double-click to add a bend. Alt-click a handle to remove it. Drag a pin to reposition it on its box.','Перетаскивайте линию: концы остаются подключёнными. Двойной клик добавляет изгиб, Alt-клик удаляет. Контакт можно переместить по блоку.','拖动导线可移动拐点，端点保持连接。双击添加拐点，Alt 点击手柄删除。拖动引脚可更改其在方框上的位置。','Arrastra la línea sin desconectar extremos. Doble clic añade un codo; Alt-clic lo elimina. Arrastra un contacto para recolocarlo.'],
    ['Command/Ctrl-click adds or removes items. Command/Ctrl-drag selects an area.','Command/Ctrl-клик меняет выделение. Command/Ctrl-перетаскивание выделяет область.','Command/Ctrl 点击可增减选择，按住拖动可框选。','Command/Ctrl-clic añade o quita elementos. Command/Ctrl-arrastrar selecciona un área.'],
    ['Applies to colored branches in Bundle view; selecting a component affects all its connected exits. This changes the drawing, not measured cable lengths.','Применяется к цветным ветвям жгута; выбор компонента затрагивает все его выходы. Меняется рисунок, не измеренная длина.','应用于线束视图的彩色分支。选择元件会影响其所有出线。仅改变绘图，不改变实际测量长度。','Afecta a las ramas de colores; seleccionar un componente afecta a todas sus salidas. Cambia el dibujo, no las longitudes medidas.']
  ];
  for(const [en,ru,zh,es] of paragraphs) table.set(en,{en,ru,'zh-CN':zh,es});
  for(const bike of ['Light Bee']){
    const en=`Replace the current drawing with the ${bike} starter map? Export first if needed.`;
    table.set(en,{en,ru:`Заменить текущую схему шаблоном ${bike}? При необходимости сначала экспортируйте проект.`,'zh-CN':`用 ${bike} 模板替换当前图纸？如需备份，请先导出。`,es:`¿Reemplazar el dibujo actual por la plantilla ${bike}? Exporta primero si necesitas una copia.`});
  }
  const newPrompt='Start a new project? Export first if you need a backup.';
  table.set(newPrompt,{en:newPrompt,ru:'Начать новый проект? Сначала экспортируйте резервную копию.','zh-CN':'新建项目？如需备份，请先导出。',es:'¿Iniciar un proyecto nuevo? Exporta primero si necesitas una copia.'});
  const key='harness-studio-ui-language';
  let lang='en'; try {lang=localStorage.getItem(key)||'en';} catch {}
  if(!['en','ru','zh-CN','es'].includes(lang)) lang='en';
  const originals=new WeakMap();
  const attributes=new WeakMap();
  const skip='svg,script,style,textarea,input,kbd,[translate="no"],[data-no-i18n],#project-status,.endpoint-text,.reference-caption,.pin-num,[data-image-catalog],.inline-check:has([data-bundle-member])';
  function translated(source) {return table.get(source)?.[lang]||source;}
  window.HarnessI18n={t:translated};
  function updateText(node) {
    if(!node.parentElement||node.parentElement.closest(skip))return;
    let record=originals.get(node);
    if(!record||node.nodeValue!==record.last)record={source:node.nodeValue};
    const original=record.source,trimmed=original.trim();
    const result=original.replace(trimmed,translated(trimmed));
    if(node.nodeValue!==result)node.nodeValue=result;
    record.last=result; originals.set(node,record);
  }
  const observer=new MutationObserver(records=>{
    if(records.some(r=>!(r.target.nodeType===1?r.target:r.target.parentElement)?.closest(skip)))apply();
  });
  function apply() {
    observer.disconnect();
    if(!window.document?.body)return;
    // Pin option values BEFORE translating text: bare <option> values otherwise change.
    document.querySelectorAll('option:not([value])').forEach(o=>o.setAttribute('value',o.textContent));
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())updateText(walker.currentNode);
    document.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el=>{
      if(el.closest('svg,[translate="no"],[data-no-i18n],.reference-thumb'))return;
      const records=attributes.get(el)||{};
      for(const attr of ['title','placeholder','aria-label']){
        if(!el.hasAttribute(attr))continue;
        const value=el.getAttribute(attr);
        let record=records[attr];if(!record||record.last!==value)record={source:value};
        const result=translated(record.source);
        if(result!==value)el.setAttribute(attr,result);
        record.last=result;records[attr]=record;
      }
      attributes.set(el,records);
    });
    document.documentElement.lang=lang;
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  const picker=document.getElementById('ui-language');
  picker.value=lang;
  picker.addEventListener('change',()=>{lang=picker.value;try{localStorage.setItem(key,lang);}catch{} apply();});
  apply();
})();
