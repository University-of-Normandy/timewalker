define(['Backbone'], function (Backbone) {

    "use strict";

    var TimeViewer, numericDate, unitDateData;

    // --------------------------------------------------------------- NAMESPACE
    TimeViewer = {
        Model: {},
        View: {},
        Templates: {}
    };

    /**
     * Get date as number
     * @param Date date
     */
    numericDate = function (date) {
        return date.getTime();
    };

    /**
     * @deprecated
     * @param date
     * @param unit
     * @returns {*}
     */
    unitDateData = function (date, unit) {
        if (!date) {
            return null;
        }
        if (!(date instanceof Date))
            date = new Date(date);

        switch (unit) {
            case 'year':
                return date.getUTCFullYear();

            // TODO month view

            // TODO Week view

            // TODO day view
        }
        throw new Error('Invalid time unit');
    };

    // --------------------------------------------------------------- TEMPLATES
    // Use Mustache's style
    _.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g
    };

    TimeViewer.Templates.renderSerie = _.template('<h2 class="tv-serie-label">{{label}}</h2><section class="tv-serie-datas"><div class="tv-serie-datas-view tv-view"></div></section>');
    TimeViewer.Templates.renderData = _.template('<strong>{{label}} : </strong><span class="period">du <time class="from">{{start}}</time> au <time class="to">{{end}}</time></span>');


    //////////////////////////////////////////////////////////////////////////////
    //
    // MODEL
    //
    //////////////////////////////////////////////////////////////////////////////

    /**
     * Data.
     */
    TimeViewer.Model.Data = Backbone.Model.extend({
        defaults: function () {
            return {
                start: null,
                end: null,
                label: 'Unamed data'
            };
        },

        getMinDate: function () {
            return this.get('start');
        },

        getMaxDate: function () {
            return this.get('end');
        }
    });

    /**
     * Collection of data
     */
    TimeViewer.Model.DataCollection = Backbone.Collection.extend({
        model: TimeViewer.Model.Data
    });

    /**
     * Serie of data
     */
    TimeViewer.Model.Serie = Backbone.Model.extend({
        defaults: function () {
            return {
                label: "Unamed serie",
                datas: new TimeViewer.Model.DataCollection()
            };
        },

        add: function (datas) {
            this.get('datas').add(datas);
        },

        getData: function () {
            return this.get('datas');
        }
    });

    /**
     * Model for main view, an aggregate of serie.
     */
    TimeViewer.Model.TimeViewer = Backbone.Collection.extend({
        model: TimeViewer.Model.Serie,
        getData: function () {
            return this;
        }
    });

    /**
     * Common method for get earliest date
     *
     * @type {Function}
     */
    TimeViewer.Model.Serie.prototype.getMinDate = TimeViewer.Model.TimeViewer.prototype.getMinDate = function () {
        var min = '9999';
        this.getData().each(function (item) {
            if (item.getMinDate() < min) {
                min = item.getMinDate();
            }
        });
        return min == '9999' ? null : min;
    };

    /**
     * Common method for get the most recent date
     *
     * @type {Function}
     */
    TimeViewer.Model.Serie.prototype.getMaxDate = TimeViewer.Model.TimeViewer.prototype.getMaxDate = function () {
        var max = '0000';
        this.getData().each(function (item) {
            if (item.getMaxDate() > max) {
                max = item.getMaxDate();
            }
        });
        return max == '0000' ? null : max;
    };


    //////////////////////////////////////////////////////////////////////////////
    //
    // VIEWS
    //
    //////////////////////////////////////////////////////////////////////////////

    /**
     * View for data
     */
    TimeViewer.View.Data = Backbone.View.extend({
        className: "tv-serie-data",
        options: {},

        /**
         * Constructor.
         *
         * @param options
         */
        initialize: function (options) {
            this.decalage = options.decalage;
            this.periodDisplay = options.periodDisplay;
            this.options = options.options;
        },

        /**
         * Render.
         *
         * @returns {TimeViewer.View.Data}
         */
        render: function () {
            var
            // begining of period
                numericBegin = numericDate(new Date(this.periodDisplay.startUse)),

            // end of period
                numericEnd = numericDate(new Date(this.periodDisplay.endUse)),

            // begining of current item
                itemStart = this.model.get('start') ? numericDate(new Date(this.model.get('start'))) : numericBegin,

            // ending of current item
                itemEnd = this.model.get('end') ? numericDate(new Date(this.model.get('end'))) : numericEnd,

            // ratio
                ratio = 100 / (numericEnd - numericBegin),

            // Calculate item width/position
                itemleft = (itemStart - numericBegin) * ratio,
                itemWidth = ((itemEnd - itemStart)) * ratio
                ;

            // Add cosmetic CSS classes
            if (!this.model.get('end')) {
                this.$el.addClass('noend');
            }
            if (!this.model.get('start')) {
                this.$el.addClass('nostart');
            }
            if (this.options.labelClass[this.model.get('label')]) {
                this.$el.addClass(this.options.labelClass[this.model.get('label')]);
            }

            if (!this.options.test) {
                this.options.test = true;
                console.log("Création d'un pointeur dans les options");
            }

            this.$el.html(TimeViewer.Templates.renderData(this.model.toJSON())).css({
                width: itemWidth + '%',
                'margin-top': (this.decalage) + 'em',
                position: 'absolute',
                left: itemleft + '%'
            });

            return this;
        }
    });

    /**
     * View for Serie of data.
     */
    TimeViewer.View.Serie = Backbone.View.extend({
        className: "tv-serie",
        options: {},

        initialize: function (options) {
            this.renderers = options.renderers || {};
            this.periodDisplay = options.periodDisplay;
            this.options = _.extend(this.options, options.options);
        },

        render: function () {
            this.$el.html(TimeViewer.Templates.renderSerie(this.model.toJSON()));
            var datas = this.$el.find('.tv-serie-datas .tv-serie-datas-view') || this.$el;
            var decalage = {}, decalageCounter = 0;

            this.model.get('datas').each(function (data) {
                if (!decalage[data.get('label')]) {
                    decalage[data.get('label')] = decalageCounter++;
                }
                var view = new TimeViewer.View.Data({
                    model: data,
                    decalage: decalage[data.get('label')],
                    periodDisplay: this.periodDisplay,
                    options: this.options
                });
                datas.append(view.render().$el);
            }.bind(this));
            this.$el.css('height', (2 + (decalageCounter * 0.75)) + 'em');
            return this;
        }
    });

    /**
     * Vue globale
     * @author Stéphane Bouvry<jacksay@jacksay.com>
     */
    TimeViewer.View.Main = Backbone.View.extend({

        events: {
            'click .next': 'handlerScrollRight',
            'click .previous': 'handlerScrollLeft',
            'click .zoomin': 'handlerZoomIn',
            'click .zoomout': 'handlerZoomOut'
        },

        className: "tv",

        // Rendering options, can be overridden at initialization
        defaultOptions: function(){
           return {
            forceBegining: null, // Force the begining
            forceEnding: null, // Same for ending
            title: 'Component title',
            renderStrategy: {
                layout: 'rendeStrategyLayout'
            },
            labelClass: {}
         };
      },

        period: {
            displayMode: 'oneyear', // Mode d'affichage : oneyear | fill | month
            startDisplay: 'auto',   // Début de la plage d'affichage
            endDisplay: 'auto',     // Fin de la plage d'affichage
            start: 'auto',          // Plus petite date (peut être null)
            end: 'auto',             // Plus grande date, peut être null
            currentYear: 'auto',
            currentMonth: null
        },

        // Les modes d'affichage
        displayModes: ['oneyear', 'fill'],

        //
        rightPos: 0,

        //
        moveStep: 1,

        // current zoom
        zoom: 100,
        zoomGap: 100,

        rendeStrategyLayout: function () {
            return '<h1 class="tv-title">' + this.options.title + '</h1>' +
                '<header class="tv-series-header">' +
                '<nav class="tv-header-nav">' +
                '<a href="#" class="previous">&larr;</a>' +
                '<a href="#" class="next">&rarr;</a>' +
                '<a href="#" class="zoomin">agrandir</a>' +
                '<a href="#" class="zoomout">réduire</a>' +
                '</nav>' +
                '<div class="tv-header-labels"><div class="tv-header-labels-view tv-view"></div></div>' +
                '</header>' +
                '<div class="tv-series">' +
                '</div>';
        },

        getPeriodDisplayed: function () {
            // Données
            var startAbsolute,   // Début absolue réél
                endAbsolute,     // Fin absolue réél

            // Les données 'use' sont égales aux données 'abs' ci-dessus, sauf
            // si ces dernières sont null, dans ce cas on utilise une plage d'un
            // an avant/après l'autre date. Si aucune date on prend l'année en
            // cour.
                endUse,     // Fin utilisée
                startUse,    // Fin utilisée
                startDisplay,
                endDisplay,
                segments,
                segmentLabels = [],
                segmentDivisions = [],
                segmentLabelStrategy,
                display;

            console.log('Date forcées:', this.options.forceBegining, this.options.forceEnding);
            startUse = startAbsolute = this.options.forceBegining ? this.options.forceBegining : this.model.getMinDate();
            endUse = endAbsolute = this.options.forceEnding ? this.options.forceEnding : this.model.getMaxDate();

            if (!startUse && !endUse) {
                startUse = (new Date()).toISOString().substring(0, 4) + '-01-01';
                endUse = (new Date()).toISOString().substring(0, 4) + '-12-31';
            }
            else if (!startUse) {
                startUse = endUse.substring(0, 4) + '-01-01';
            }
            else if (!endUse) {
                endUse = startUse.substring(0, 4) + '-12-31';
            }

            if (this.period.startDisplay == 'auto') {
                startDisplay = endUse.substring(0, 4) + '-01-01';
            }
            if (this.period.endDisplay == 'auto') {
                endDisplay = endUse.substring(0, 4) + '-12-31';
            }

            switch (this.period.displayMode) {
                case 'oneyear':
                    segments = (endUse.substring(0, 4) - startUse.substring(0, 4)) + 1;
                    segmentDivisions = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jui', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
                    segmentLabelStrategy = function (value) {
                        return "Année " + value;
                    };
                    break;
                default :
                    throw new Error("displayMode not implemented");
            }

            for (var i = parseInt(startUse.substring(0, 4)); i <= endUse.substring(0, 4); i++) {
                segmentLabels.push(segmentLabelStrategy(i));
            }
            // Nombre de segment
            display = {
                segments: segments,
                segmentLabels: segmentLabels,
                segmentDivisions: segmentDivisions,
                mode: this.period.displayMode,
                startAbsolute: startAbsolute,
                endAbsolute: endAbsolute,
                startUse: startUse,
                endUse: endUse,
                startDisplay: startDisplay,
                endDisplay: endDisplay,
            };

            return display;
        },

        handlerZoomIn: function () {
            console.log('ZOOMIN', this.currentSizeStep, this.sizeStep);
            if (this.currentSizeStep > 1) {
                this.currentSizeStep -= 1;
            }
            this.sizing();
        },

        getSize: function () {
            return this.sizeStep * 100 / (this.sizeStep - this.currentSizeStep + 1);
        },

        /**
         * Fix the view size.
         */
        sizing: function () {
            this.$el.find('.tv-view').css('width', (this.getSize()) + '%');
            this.placing();
        },

        /**
         * Fix the view location
         */
        placing: function () {
            var right = this.getSize();
            this.$el.find('.tv-view').css('right', -(this.getSize() / this.sizeStep) * this.rightPos + '%');
        },

        ////////////////////////////////////////////////////////////////////////
        // HANDLERS
        handlerZoomOut: function () {
            if (this.currentSizeStep < this.sizeStep) {
                this.currentSizeStep += 1;
            }
            this.sizing();
        },

        handlerScrollRight: function () {
            if (this.rightPos > 0) {
                this.rightPos--;
            }
            this.placing();
        },

        handlerScrollLeft: function () {
            if (this.rightPos < this.sizeStep - 1) {
                this.rightPos++;
            }
            this.placing();
        },

        ////////////////////////////////////////////////////////////////////////
        // CORE METHODS
        initialize: function (attributes, options) {
            this.options = _.extend(this.defaultOptions(), options);
            if (!this.model) {
                console.log("Création d'un modèle vide");
                this.model = new TimeViewer.Model.TimeViewer();
            }
        },

        render: function () {
            var periodDisplay = this.getPeriodDisplayed(),
                tvDatas,
                headerTime,
                i,
                timeDivisionModel;


            this.$el.html(this[this.options.renderStrategy.layout]());

            headerTime = this.$el.find('.tv-header-labels-view');
            tvDatas = this.$el.find('.tv-series');
            timeDivisionModel = $('<div class="tv-header-labels-divisions"></div>');


            for (i = 0; i < periodDisplay.segmentDivisions.length; i++) {
                timeDivisionModel.append('<span class="division" style="display: inline-block; width: ' + (100 / periodDisplay.segmentDivisions.length) + '%">' +
                    periodDisplay.segmentDivisions[i] +
                    '</span>');
            }

            for (i = 0; i < periodDisplay.segmentLabels.length; i++) {

                headerTime.append($('<div class="tv-segment-header" style="width: ' + (100 / periodDisplay.segmentLabels.length) + '%">' +
                    '<h4>' + periodDisplay.segmentLabels[i] + '</h4>' +
                    timeDivisionModel.clone().html() +
                    '</div>'));
            }

            this.model.each(function (serie) {
                var view = new TimeViewer.View.Serie({
                    model: serie,
                    periodDisplay: periodDisplay,
                    options: this.options
                });
                tvDatas.append(view.render().$el);
            }.bind(this));

            this.sizeStep = periodDisplay.segmentLabels.length;
            this.rightPos = 0;
            this.currentSizeStep = this.sizeStep;

            this.sizing();
            this.placing();

            return this;
        },

        // WORK
        /**
         * Add a serie (timeline) to timeviewer with optional data (array).
         * @var name string Unique name of the serie (use in label).
         * @var datas array|null An array of data for the serie.
         * @var silent boolean
         */
        addSerie: function (name, datas, silent) {
            var serie;
            if (!this.getSerie(name)) {
                // Création de la série
                serie = new TimeViewer.Model.Serie(datas, {name: name});

                // Ajout au modèle
                this.series.push(serie);
            }
            return serie;
        },

        displayPreviousPeriod: function () {
            console.log('todo', 'display previous period');
        },

        displayNextPeriod: function () {
            console.log('todo', 'display next period');
        },

        displayCurrentPeriod: function () {

        },

        /**
         * Return serie by name, null if not.
         */
        getSerie: function (name) {
            var serie = null;
            _.each(this.series, function (s) {
                if (s.name == name) {
                    serie = s;
                }
            });
            return serie;
        },

        ////////////////////////////////////////////////////////////////////////
        // HANDLERS
        onClick: function (event) {
            console.log('click on TimeViewer');
        }
    });
    return TimeViewer;
});
