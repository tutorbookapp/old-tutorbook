import {
    MDCRipple
} from '@material/ripple/index';

import $ from 'jquery';

class HorzScroller {
    constructor(id = 'horz-scroller', scroll = 0) {
        this.id = id;
        this.scroll = scroll;
        this.render = window.app.render;
        this.renderSelf();
    }

    renderSelf() {
        this.el = this.render.template('horz-cards', {
            id: this.id,
        });
    }

    manage() {
        this.managed = true;
        const that = this;
        $(this.el).find('#left').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
            this.addEventListener('click', () => {
                // 1) Get the current horizontal scroll left
                const horz = $(this).parent().find('.horz-layout-grid__inner');
                const current = horz.scrollLeft();
                // 2) Get the width of each mdc-card (how much we must scroll)
                const width = $(this).parent().find('.mdc-card').css('width');
                const left = new Number(width.replace('px', '')) + 24;
                // 3) Scroll to the new position (and always round up)
                const scroll = Math.round(current - (left + 0.5));
                horz.animate({
                    scrollLeft: scroll,
                }, 200);
                // 4) Update scrollPosition and which scroll buttons are showing
                that.update(scroll);
            });
        });
        $(this.el).find('#right').each(function() {
            MDCRipple.attachTo(this).unbounded = true;
            this.addEventListener('click', () => {
                const horz = $(this).parent().find('.horz-layout-grid__inner');
                const current = horz.scrollLeft();
                const width = $(this).parent().find('.mdc-card').css('width');
                const left = new Number(width.replace('px', '')) + 24;
                const scroll = Math.round(current + (left + 0.5));
                horz.animate({
                    scrollLeft: scroll,
                }, 200);
                that.update(scroll);
            });
        });
    }

    reManage() {
        $(this.el).find('.horz-layout-grid__inner').scrollLeft(this.scroll);
    }

    update(scroll = $(this.el).find('.horz-layout-grid__inner').scrollLeft()) {
        // 1) Get the scroller's width by adding all cards's widths
        const scrollerWidth = () => {
            var count = 0,
                width = 0;
            $(this.el).find('.mdc-card').each(function() {
                width += new Number($(this).css('width').replace('px', ''));
                count++;
            });
            return [width / count, width];
        };
        // 2) Save the current horizontal scroll for when user reViews dashboard
        this.scroll = scroll;
        // 3) Show or hide nav btns based on the current scroll position
        const left = $(this.el).find('#left');
        const right = $(this.el).find('#right');
        const [card, width] = scrollerWidth();
        const noScrolling = width <= document.body.clientWidth - 48;
        (noScrolling || scroll <= 0) ? left.hide(): left.show();
        (noScrolling || scroll + 3 * card >= width) ? right.hide(): right
            .show();
    }
};

module.exports = HorzScroller;