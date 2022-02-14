function testWebP(callback) {

	var webP = new Image();
	webP.onload = webP.onerror = function () {
		callback(webP.height == 2);
	};
	webP.src = "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
}

testWebP(function (support) {

	if (support == true) {
		document.querySelector('body').classList.add('webp');
	} else {
		document.querySelector('body').classList.add('no-webp');
	}
});

class Slider {
	constructor(element, { pagination = false, loop = false }) {
		this.sliderElement = element;
		this.sliderWrapper;
		this.sliderLine = element.querySelector('.slider-line');
		this.sliderItems = [...element.querySelectorAll('.slider-item')];
		this.arrowParent = element.querySelector('.control-arrows');
		this.arrowPrev = element.querySelector('.control-arrows__item-prev');
		this.arrowNext = element.querySelector('.control-arrows__item-next');
		this.controlPagination = pagination && element.querySelector('.control-pagination');
		this.pagination = pagination;
		this.loop = loop;

		this.paginationBullets; // массив элементов пагинации
		this.sliderWrapperWidth; // ширина слайдера
		this.currentIndex = 0; // текущий индекс слайда
		this.itemsLength = this.sliderItems.length; // длина массива слайдов
		this.arrPosition = []; // Массив значений трансформа 
		this.flag = false; // Флаг для циклического режима

		// переменные для свайпа
		this.move = false; // сигнализатор движения слайда
		this.currentItem; // текущий слайд
		this.startX; // начальная координата X при клике/касании
		this.currentTransform; // текущее значение transform у карусели
		this.centerSlide; // координаты центра слайда
		this.lastPointerX; // стартовая позиция указателя по оси X
		this.timestamp; // начальное время для расчета скорости
		this.speedX; // скорость указателя при движении по оси Х


		// Привязка this к классу slider
		this.slidePrev = this.slidePrev.bind(this);
		this.slideNext = this.slideNext.bind(this);
		this.resizeWindow = this.resizeWindow.bind(this);
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);

		this.wrapItems();
		this.events();
	}

	// Обработчики событий
	events() {
		window.addEventListener('resize', this.resizeWindow);

		let handlerSlidePrev = debounce(this.slidePrev, 600);
		let handlerSlideNext = debounce(this.slideNext, 600);
		this.arrowPrev.addEventListener('click', handlerSlidePrev);
		this.arrowNext.addEventListener('click', handlerSlideNext);

		if (this.paginationBullets) {
			this.paginationBullets.forEach((bullet, index) => {
				bullet.addEventListener('click', () => {
					this.selectPaginationSlide(index);
				});
			});
		}

		this.sliderWrapper.addEventListener('pointerdown', this.onPointerDown);
	}

	// Обернуть все slider-item в slider-wrapper
	wrapItems() {
		this.sliderLine = document.createElement('div');
		this.sliderLine.className = 'slider-line';
		this.sliderWrapper = document.createElement('div');
		this.sliderWrapper.className = 'slider-wrapper';
		this.sliderItems.forEach(item => this.sliderWrapper.appendChild(item));
		this.sliderLine.appendChild(this.sliderWrapper);
		this.sliderElement.insertAdjacentElement('afterbegin', this.sliderLine);
		this.sliderWrapperWidth = this.sliderWrapper.offsetWidth;

		// Проверка на бесконечную прокрутку
		if (this.loop) {
			this.initLoopSlider();
			this.sliderWrapper.style.transition = `none`;
			this.sliderWrapper.style.transform = `translate(${-this.sliderWrapperWidth}px,0)`;
			this.sliderItems.forEach((item, index) => {
				this.arrPosition.push((index + 1) * -this.sliderWrapperWidth);
			});
		} else {
			this.disabledArrow(this.arrowPrev);
			this.sliderItems.forEach((item, index) => {
				this.arrPosition.push(index * -this.sliderWrapperWidth);
			});
		}

		if (this.pagination) {
			this.createPaginationBullets();
		}
	}

	// Создать элементы пагинации
	createPaginationBullets() {
		let bullets = '';
		for (let i = 0; i < this.itemsLength; i++) {
			bullets += `<span class="control-pagination__bullet"></span>`;
		}

		this.controlPagination.insertAdjacentHTML('afterbegin', `${bullets}`);
		this.paginationBullets = this.controlPagination.querySelectorAll('.control-pagination__bullet');
		this.paginationBullets[this.currentIndex].classList.add('active');
	}

	// Инициализация "бесконечности" прокрутки
	initLoopSlider() {
		let firstSliderElem = this.sliderItems[0].cloneNode(true);
		firstSliderElem.className = 'first-slider-elem';
		let lastSliderElem = this.sliderItems[this.itemsLength - 1].cloneNode(true);
		lastSliderElem.className = 'last-slider-elem';
		this.sliderWrapper.prepend(lastSliderElem);
		this.sliderWrapper.append(firstSliderElem);
	}

	// Прдедыдущий слайд
	slidePrev() {
		if (this.currentIndex <= 0) {
			this.currentIndex = 0;
			this.flag = true;
		} else {
			this.currentIndex--;
		}
		let totalValue = this.arrPosition[this.currentIndex];
		this.setChangeSlide(totalValue);
	}

	// Следующий слайд
	slideNext() {
		if (this.currentIndex >= this.itemsLength - 1) {
			this.currentIndex = this.itemsLength - 1;
			this.flag = true;
		} else {
			this.currentIndex++;
		}
		let totalValue = this.arrPosition[this.currentIndex];
		this.setChangeSlide(totalValue);
	}
	// Клик по пагинации
	selectPaginationSlide(index) {
		let totalValue = this.arrPosition[index];;
		this.currentIndex = index;
		this.flag = false;
		this.setChangeSlide(totalValue);
	}

	// Принять все изменения по кликам на стрелки/пагинацию
	setChangeSlide(value) {
		this.sliderWrapper.style.transition = ``;

		if (this.flag && this.loop) {
			this.activeLoop();
		} else {
			if (!this.loop && this.currentIndex <= 0) {
				this.disabledArrow(this.arrowPrev);
				this.enabledArrow(this.arrowNext);
			} else if (!this.loop && this.currentIndex >= this.itemsLength - 1) {
				this.disabledArrow(this.arrowNext);
				this.enabledArrow(this.arrowPrev);
			} else {
				this.enabledArrow(this.arrowPrev);
				this.enabledArrow(this.arrowNext);
			}

			if (this.paginationBullets) {
				this.showActivePaginationElement(this.paginationBullets);
			}
			this.setPositionSliderWrapper(value);
		}
	}

	// Деактивировать кнопку пролистывания
	disabledArrow(element) {
		element.style.opacity = '0.3';
		element.disabled = true;
	}

	// Активировать кнопку пролистывания
	enabledArrow(element) {
		element.style.opacity = '1';
		element.disabled = false;
	}

	// Показать активный элемент пагинации
	showActivePaginationElement(list) {
		list.forEach(bullet => bullet.classList.remove('active'));
		list[this.currentIndex].classList.add('active');
	}

	// Активировать цикличность слайдера, находясь на крайних слайдах
	activeLoop() {
		let totalValue;
		if (this.currentIndex === this.itemsLength - 1) {
			totalValue = this.arrPosition[this.arrPosition.length - 1] - this.sliderWrapperWidth;
			this.currentIndex = 0;
		} else if (this.currentIndex === 0) {
			totalValue = 0;
			this.currentIndex = this.itemsLength - 1;
		}

		this.setPositionSliderWrapper(totalValue);
		if (this.paginationBullets) {
			this.showActivePaginationElement(this.paginationBullets);
		}

		this.sliderWrapper.addEventListener('transitionend', () => {
			this.sliderWrapper.addEventListener('pointerdown', this.onPointerDown);
			this.sliderWrapper.style.transition = `none`;
			this.setPositionSliderWrapper(this.arrPosition[this.currentIndex]);
		}, { once: true });
		this.flag = false;
	}

	// Задать нужные координаты обёртке wrapper
	setPositionSliderWrapper(value) {
		this.sliderWrapper.style.transform = `translate(${value}px,0)`;
	}

	// Ресайз окна
	resizeWindow() {
		this.arrPosition = [];
		this.sliderWrapperWidth = this.sliderItems[0].offsetWidth;
		if (this.loop) {
			this.sliderItems.forEach((item, index) => {
				this.arrPosition.push((index + 1) * -this.sliderWrapperWidth);
			});
		} else {
			this.sliderItems.forEach((item, index) => {
				this.arrPosition.push(index * -this.sliderWrapperWidth);
			});
		}
		this.sliderWrapper.style.transition = `none`;
		this.sliderWrapper.style.transform = `translate(${this.arrPosition[this.currentIndex]}px,0)`;
	}

	// Методы для свайпа
	onPointerDown(e) {
		this.currentItem = e.target.closest('div');
		this.coordsLine = this.sliderLine.getBoundingClientRect();
		this.centerSlide = this.sliderWrapperWidth / 2;

		this.currentTransform = this.arrPosition[this.currentIndex];
		this.startX = e.clientX;

		this.timestamp = Date.now(); // стартовое время для расчета скорости
		this.lastPointerX = e.clientX;

		document.addEventListener('pointermove', this.onPointerMove);
		document.addEventListener('pointerup', this.onPointerUp);
	}

	onPointerMove(e) {
		this.coordsItemStart = this.currentItem.getBoundingClientRect().x - this.coordsLine.x;
		this.coordsItemEnd = this.currentItem.getBoundingClientRect().x + this.sliderWrapperWidth - this.coordsLine.x;

		// Узнаем скорость движения мыши/пальца
		let now = Date.now();
		let dt = now - this.timestamp;
		let dx = Math.abs(e.clientX - this.lastPointerX);
		this.speedX = dx / dt * 100;

		let newX = e.clientX - this.startX + this.currentTransform; // координата для установки нужного transform 

		this.sliderWrapper.style.transition = `none`;
		this.sliderWrapper.style.transform = `translate(${newX}px,0)`;


		this.move = true; // сигнализируем что движение слайда было произведено
		this.sliderWrapper.ondragstart = function () {
			return false;
		};
	}

	onPointerUp(e) {
		document.removeEventListener('pointermove', this.onPointerMove);
		document.removeEventListener('pointerup', this.onPointerUp);


		// Проверки для смены слайда
		if (this.speedX > 80) {
			if (
				this.currentIndex === 0 &&
				this.coordsItemStart > 0 &&
				this.move &&
				this.loop
			) {
				this.flag = true;
				this.sliderWrapper.removeEventListener('pointerdown', this.onPointerDown);
			} else if (
				this.currentIndex === this.itemsLength - 1 &&
				this.coordsItemStart < 0 &&
				this.move &&
				this.loop
			) {
				this.flag = true;
				this.sliderWrapper.removeEventListener('pointerdown', this.onPointerDown);
			} else if (
				this.currentIndex === 0 &&
				this.coordsItemStart > 0 &&
				this.move &&
				!this.loop
			) {
				this.currentIndex = 0;
			} else if (
				this.currentIndex === this.itemsLength - 1 &&
				this.coordsItemStart < 0 &&
				this.move &&
				!this.loop
			) {
				this.currentIndex = this.itemsLength - 1;
			} else if (
				this.coordsItemStart < 0 &&
				this.move
			) {
				this.currentIndex++;
			} else if (
				this.coordsItemStart > 0 &&
				this.move
			) {
				this.currentIndex--;
			}
		} else {
			if (
				this.currentIndex === 0 &&
				this.coordsItemStart > this.centerSlide &&
				this.loop
			) {
				this.flag = true;
				this.sliderWrapper.removeEventListener('pointerdown', this.onPointerDown);
			} else if (
				this.currentIndex === this.itemsLength - 1 &&
				this.coordsItemEnd < this.centerSlide &&
				this.loop
			) {
				this.flag = true;
				this.sliderWrapper.removeEventListener('pointerdown', this.onPointerDown);
			} else if (
				this.currentIndex === 0 &&
				this.coordsItemStart > this.centerSlide &&
				!this.loop
			) {
				this.currentIndex = 0;
			} else if (
				this.currentIndex === this.itemsLength - 1 &&
				this.coordsItemEnd < this.centerSlide &&
				!this.loop
			) {
				this.currentIndex = this.itemsLength - 1;
			} else if (
				this.coordsItemStart > this.centerSlide &&
				this.move
			) {
				this.currentIndex--;
			} else if (
				this.coordsItemEnd < this.centerSlide &&
				this.move
			) {
				this.currentIndex++;
			}
		}

		this.move = false; // обнуляем переменную движения слайда
		this.setChangeSlide(this.arrPosition[this.currentIndex]);
	}
}


// Вспомогательные функции
function debounce(func, ms) {
	let flag = false;
	return function () {
		if (flag) return;
		func();
		flag = true;
		setTimeout(() => {
			flag = false;
		}, ms);
	}
}

function throttle(func, ms) {
	let flag = false;
	let savedThis;
	let savedArgs;
	function wrapper(...args) {
		if (flag) {
			savedThis = this;
			savedArgs = args;
			return;
		}

		func.apply(this, args);
		flag = true;
		setTimeout(() => {
			flag = false;
			if (savedArgs) {
				func.apply(savedThis, savedArgs);
				savedThis = savedArgs = null;
			}
		}, ms);

	}
	return wrapper;
}


const slider = new Slider(
	document.querySelector('.mainslider'),
	{
		pagination: true,
		loop: true
	}
);











