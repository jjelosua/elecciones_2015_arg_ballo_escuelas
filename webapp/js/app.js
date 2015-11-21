requirejs.config({
    baseUrl: 'js',
    paths: {
        'draw': '../libs/leaflet.draw',
        'templates': '../templates', 
        'text': '../libs/requirejs-text/text',
        'd3': '../libs/d3/d3.min',
        'jquery': '../libs/jquery/dist/jquery.min',
        'jquery-ui': '../libs/jquery-ui/jquery-ui.min',
        'cartodbjs': '../libs/cartodb.js/cartodb.uncompressed'
    },
    shim: {
        'draw': ['cartodbjs'],
        'jquery-ui': ['jquery']
    }
});

requirejs(['app/context', 'app/config', 'app/templates', 'app/carto',
           'app/media', 'app/overlay', 'app/helpers', 'app/view_helpers',
           'app/draw', 'app/permalink', 'd3', 'cartodbjs','jquery-ui'],
function(ctxt, config, templates, cdb, media, Overlay, helpers, view_helpers, draw, permalink, d3, dummy, dummy2) {
    $(function() {
    "use strict";
        var _self = this;
        var map;

        // responsive
        // TODO PYM 
        //_self.pymChild = new pym.Child();
        // FIN TODO PYM
        
        // STATIC TEMPLATES
        d3.select('#btn_nav').html(templates.nav_html);
        d3.select('#help_draw').html(templates.ayuda_draw_html);
        // Tooltip template 
        var popup_tpl = _.template(templates.popup_html);
        // Percentages tooltip template 
        var popup_perc_tpl = _.template(templates.popup_perc_html);
        // Differences tooltip template
        var popup_diff_tpl = _.template(templates.popup_diff_html);
        // Telegram template
        var telegram_tpl = _.template(templates.telegramas_html);


        // First get permalink status and set context accordingly
        permalink.get();
        permalink.validate();

        //Limit bounds of map to Argentina + offset
        var southWest = L.latLng(-57.54, -78.97),
            northEast = L.latLng(-9.84, -46.96),
            bounds = L.latLngBounds(southWest, northEast);

        // Initialize map
        map = L.map('map_container', {
            center: [ctxt.lat, ctxt.lng],
            zoom: ctxt.zoom,
            minZoom: 4,
            maxZoom: 18,
            attributionControl: false,
            //zoomControl: false
            maxBounds: bounds
        });

        // Init SQL API
        config.sql = new cartodb.SQL({
            user: config.carto_user
        });
        // Add base layer
        map.addLayer(config.base_layer);
        //Draw controls
        map.addControl(draw.drawControlFull);
        //Draw control
        map.addLayer(draw.drawnItems);

        //JET: Load sections 
        $.get("data/dict_partidos.json", function(data){
            config.diccionario_datos = data;
            init();
        });

        /** After data is loaded launch app */
        function init() {
            config.screen_width = $(window).width();
            update_nav(true);
            // initialize range 
            _self.overlay = new Overlay(map);
            // Add cartodb_layer that being asynchronous
            // launches update after loading
            add_cartodb_layer();
        }

        // Set initial zoom level for responsiveness
        //media.set_media_zoom();
        
        function add_cartodb_layer() {
            // Add empty layer
            cartodb.createLayer(map, {
                user_name: config.carto_user,
                type: 'cartodb',
                sublayers: [{}]
            })
            .addTo(map)
            .on('done', function(layer) {
                // Check if the layer has loaded
                layer.on("load", function() {
                    $(".loader").hide();
                    _self.overlay.update_ref();
                });
                var sublayer = layer.getSubLayer(0);
                config.carto_layers.push(layer.getSubLayer(0));
                layer.setInteraction(true);
                layer.on('featureClick', featureClick)
                     .on('featureOver', featureOver)
                     .on('featureOut', featureOut);
                update();

                // TODO PYM
                //_self.pymChild.sendHeight();
                //$(window).resize(_.debounce(resizedw,500));
                // FIN TODO
            })
            .on('error', function(err) {console.log(err);});
        }

        // Update window
        // TODO PYM
        // function resizedw() { // on resize stop event
        //     var w = $(window).width();
        //     if(config.screen_width != w){
        //         config.screen_width = w;
        //         var h = $(window).height();
        //         _self.pymChild.sendHeight();
        //     }
        // }
        // FIN TODO


        /** update vizualization based on the actual context */
        function update() {
            // Get new query, cartocss and interactivity
            cdb.update_layer();

            // After loading the data simulate click if needed
            // If we have a selected polling station simulate click
            // We only show the overlay 
            if (ctxt.selected_polling) {
                var id_agrupado = ctxt.selected_polling;
                config.sql.execute(templates.permalink_sql,{'id_agrupado': id_agrupado})
                .done(function(data) {
                    var position = JSON.parse(data.rows[0].g).coordinates;
                    var latlng = L.latLng(position[1], position[0]);
                    map.panTo(latlng);
                    var d = data.rows[0];
                    featureClickDone(latlng, d, data);
                });
            }
        }

        function draw_deleted(e) {
            if (!draw.drawnItems.getLayers().length) {
                draw.drawControlEditOnly.removeFrom(map);
                draw.drawControlFull.addTo(map);
                $('svg.leaflet-zoom-animated').css('pointer-events','none');
            }
        }

        function draw_filter(e) {
            var draw_layer, latlng = null;
            if (e.type === "draw:created") {
                draw_layer = e.layer;
                latlng = draw_layer.getBounds().getCenter(); 
                draw.drawnItems.addLayer(draw_layer);
                draw.drawControlFull.removeFrom(map);
                draw.drawControlEditOnly.addTo(map);
                //Hack around the issue with two svgs inside leaflet-overlay-pane
                //Allow pointer events only when a shape is drawn
                $('svg.leaflet-zoom-animated').css('pointer-events','auto');
            }
            else {
                draw_layer = e.layers.getLayers()[0];
                latlng = draw_layer.getBounds().getCenter();
            }
            // Get the coordinates of the polygon we just drew
            var poly = draw_layer.getLatLngs();
            var sql_poly = [];
            for (var i in poly){
                sql_poly.push("CDB_LatLng("+poly[i].lat+","+poly[i].lng+")");
            }
            //SQL polygon must be a CLOSED loop
            sql_poly.push("CDB_LatLng("+poly[0].lat+","+poly[0].lng+")");
            //Center and zoom the map
            map.panTo(latlng);
            config.sql.execute(templates.draw_sql,{bounds: sql_poly.join()})
            .done(_.partial(featureClickDone, latlng, null))
            .error(function(errors) {
                console.log(errors);
            });
        }

        function featureClick(event, latlng, pos, data, layerNumber) {
            config.current_ltlng = latlng;
            map.panTo(latlng);

            if (ctxt.selected_tab != "escuela") {
                // Get hexagon data from DB
                config.sql.execute(templates.click_hex_sql,{ids: data.agg_list})
                    .done(_.partial(featureClickDone, latlng, null))
                    .error(function(errors) {
                        console.log(errors);
                    });
            }
            else {
                if (ctxt.selected_polling && ctxt.selected_polling != data.id_agrupado) {
                    map.closePopup();
                }

                ctxt.selected_polling = data.id_agrupado;
                //Finally update permalink
                permalink.set();

                //Analytics
                if (latlng !== null) {
                    fire_analytics_event("establecimiento",ctxt.selected_polling);
                }

                // Get rid of helper texts
                if ($('div#help_draw').is(":visible")) {
                    $('div#help_draw').fadeOut(200); 
                }

                // Get polling data from DB
                setTimeout(function() {
                    var fid = data.id_agrupado;
                    var query = templates.click_feature_sql;
                    var params = {'id_agrupado': fid};
                    config.sql.execute(query, params)
                        .done(_.partial(featureClickDone, latlng, data))
                        .error(function(errors) {
                            // errors contains a list of errors
                            console.log(errors);
                        });
                }, 200);
            }
            return false;
        }

        //Called when the Cartodb SQL has finished
        //Can be coming from a featureClick or a draw selection
        function featureClickDone(latlng, establecimiento_data, votos_data) {
            var popup = null;

            // ONLY WHEN DRAWING
            if (!votos_data.total_rows) {
                var msg_header = "Error";
                var msg_body = "No se ha encontrado ninguna escuela con la selección actual";
                popup = L.popup()
                         .setLatLng(latlng)
                         .setContent(popup_tpl({message_header: msg_header,
                                                message_body: msg_body}))
                         .openOn(map);
                return false;
            }

            // If it comes after a drawing or hexagon selection establecimiento_data is null
            if (!establecimiento_data) {
                establecimiento_data = {
                    nombre: "Escuelas incluidas: "+votos_data.rows[0].num_loc,
                    electores: votos_data.rows[0].electores,
                    votantes: votos_data.rows[0].votantes,
                    positivos: votos_data.rows[0].positivos
                };
                // For the crowdsourcing 
                $("body").addClass("dibujo");
            } else {
                $("body").removeClass("dibujo");
            }
            var winner = ctxt.selected_party != "0000" ? false: true;
            var show_telegram = ctxt.selected_polling ? true: false;
            var ttip_data = {poll: establecimiento_data,
                             winner: winner,
                             v: votos_data,
                             dict_datos: config.diccionario_datos,
                             vh: view_helpers,
                             escuela: show_telegram};

            if (ctxt.selected_tab == "difpaso") {
                // Remove unused party data
                ttip_data.v.rows = _.where(ttip_data.v.rows, {id_partido: ctxt.selected_party});
                popup = L.popup().setLatLng(latlng)
                                 .setContent(popup_diff_tpl(ttip_data))
                                 .openOn(map);
                return false;
            }

            //Tooltip
            popup = L.popup().setLatLng(latlng)
                             .setContent(popup_perc_tpl(ttip_data))
                             .openOn(map);

            // Show the list of linked telegrams
            d3.select("div.telegramas").on('click', function(d) {
                if (ctxt.selected_polling) {
                    fire_analytics_event("telegramas",ctxt.selected_polling);
                    var id_agrupado = ctxt.selected_polling;
                    config.sql.execute(templates.cdb_telegrams_sql,
                                       {id_agrupado: id_agrupado})
                    .done(function(data) {
                        var append_to = d3.select('#append');
                        var params = {'data': data.rows,
                                      'nombre': establecimiento_data.nombre,
                                      'vh': view_helpers,
                                      'preffix': ""};
                        append_to.html(telegram_tpl(params)).style('opacity', 0).transition().style('opacity', 1);  
                        d3.select('#append').on('click', function(){
                            d3.select(".creVent")
                              .transition().style('opacity', 0)
                              .each('end', function(){append_to.html("");});
                            }, false);
                        }, false)
                    .error(function(errors) {
                        console.log(errors);
                    });
                }
            }, false);

            //Overlay calculation
            var d = votos_data.rows;
            d.forEach(function(d) {
                d.pct = (d.votos / establecimiento_data.positivos) * 100;
            });

            // Update overlay and open it up
            _self.overlay.update(d, establecimiento_data);
            _self.overlay.unfold();
        }

        function featureOver(e, latlng, pos, data, layerNumber) {
            $('#map_container').css('cursor', 'pointer');
        }

        function featureOut(e) {
            $('#map_container').css('cursor', 'auto');
        }

        /** RESET EVENTS */
        function reset_map() {
            // Reset map position
            if (is_small_screen()) {
                map.setView(config.arg_center, config.izoom_mob);
            }
            else {
                map.setView(config.arg_center, config.izoom);
            }
        }

        function fire_analytics_event(action, data){
            _gaq.push(['_trackEvent','elecciones_2015_arg_pv_escuelas',
                       action, data]);
        }

        function my_popup_close(e) {
            ctxt.selected_polling = null;
            permalink.set();
            setTimeout(function(){ // wait to see if it is just a feature change
                if (!ctxt.selected_polling) {
                    _self.overlay.fold();
                }
            }, 200);
        }

        /** Can be accessed on init or tab click */
        function update_nav(init) {
            /*jshint validthis: true */
            if (init) {
                d3.selectAll(".btn").classed('on', false);
                var selector = ".btn#"+ctxt.selected_tab;
                $(selector).addClass("on");
                $("body").addClass(ctxt.selected_tab);
            }
            else if (!this.classList.contains("on")) {
                d3.selectAll(".btn").classed('on', false);
                d3.selectAll(".btn").classed('visible', false);
                var $el = $(this); 
                $el.addClass("on");
                var btn_id = $el.attr("id").replace('#','');
                fire_analytics_event("click",btn_id);
                ctxt.selected_polling = null;
                ctxt.selected_tab = btn_id;
                d3.select("body").classed("escuela difpaso fuerza", false);
                $("body").addClass(btn_id);
                switch (btn_id) {
                    case 'escuela':
                        ctxt.selected_party = '0000';
                        break;
                    case 'fuerza':
                        // defaults to winner party
                        ctxt.selected_party = '0000';
                        break;
                    case 'difpaso':
                        // defaults to winner party
                        ctxt.selected_party = '0131';
                        break;
                }
                // Fire an update of the app
                map.closePopup();
                permalink.set();
                _self.overlay.update_filter();
                _self.overlay.fold();
                cdb.update_layer();
                return false;
            }
        }

        /** HTML EVENTS */
        // filter buttons
        d3.selectAll(".short").on('click', function (){
        /*jshint validthis: true */
            map.closePopup();
            // To hide filters if we are on mobile
            var city = $(this).attr('id');
            // Google analytics
            fire_analytics_event("shortcut", city);
            // Set the new context and save in permalink
            ctxt.lat = config.cities[city].center.lat;
            ctxt.lng = config.cities[city].center.lng;
            ctxt.zoom = config.cities[city].zoom;
            permalink.set();
            // Finally setView
            map.setView(config.cities[city].center, 
                        config.cities[city].zoom);
        }, false);
        

        // Tab buttons
        d3.selectAll('.btn').on('click', update_nav);


        /** credits button*/
        d3.select('#creditos').on('click', function(){
           
            var append_to = d3.select('#append');
            append_to.html(templates.creditos_html).style('opacity', 0).transition().style('opacity', 1);  
           
            d3.select('#append .cerrar').on('click', function(){
                d3.select(".creVent")
                    .transition().style('opacity', 0)
                    .each('end', function(){append_to.html("");});
                
            }, false); 

        }, false);

        /** methodology button*/
        d3.select('#metodo').on('click', function(){ 
            var append_to = d3.select('#append');
            append_to.html(templates.metodologia_html).style('opacity', 0).transition().style('opacity', 1);  
            d3.select('#append').on('click', function(){
                d3.select(".creVent")
                    .transition().style('opacity', 0)
                    .each('end', function(){append_to.html("");});
                }, false);
        }, false);

        
        //Search
        $(".lupa").click(function(){
            var $search = $("#searchbox");
            $("#buscar").toggleClass('activo');
            $search.toggleClass('invisible');
            if (!($search.hasClass("invisible"))) {
                $search.focus();
            }
            $search.val(null);
        });

        //Btn NO form
        $(".chequea").click(function(){
            $(".formu").toggleClass('on');
        });

        //Mobile
        $("#menu").click(function(){
            $("#escuela, #fuerza, #difpaso").toggleClass('visible');
        });

        //Hide drawing helper text on click
        d3.select("div#help_draw").on('click', function(d) {
            d3.select(this).transition().duration(500).style('opacity', 0);
        }, false);

        /** searchbox */
        $("#searchbox").autocomplete({
            source: function( request, response ) {
                var s;
                config.sql.execute(templates.search_sql,{q: request.term})
                .done(function(data) {
                   response(data.rows.map(function(r) {
                      return {
                        label: "("+r.localidad+") "+r.nombre+", "+r.direccion,
                        value: r.id_agrupado+" - ("+r.localidad+") "+r.nombre+", "+r.direccion
                      };
                    })
                  );
                });
              },
              minLength: 3,
              select: function( event, ui ) {
                ctxt.selected_polling = ui.item.value.split("-")[0].trim();
                fire_analytics_event("search",ctxt.selected_polling);
                if (ctxt.selected_tab != "escuela") {
                    ctxt.selected_tab = "escuela";
                    cdb.update_layer();
                }
                permalink.set();
                update_nav(true);
                var id_agrupado = ctxt.selected_polling;
                d3.select("body").classed("escuela difpaso fuerza", false);
                $("body").addClass("escuela");
                config.sql.execute(templates.permalink_sql,{'id_agrupado': id_agrupado})
                .done(function(data) {
                    var position = JSON.parse(data.rows[0].g).coordinates;
                    var latlng = L.latLng(position[1], position[0]);
                    map.panTo(latlng);
                    var d = data.rows[0];
                    featureClickDone(latlng, d, data);
                });             
                $("#buscar").toggleClass('activo');
                $("#searchbox").toggleClass('invisible');

           }
        });

        /** MAP EVENTS */

        // Hide overlay if dragged position is out of bounds
        map.on('dragend', function(e) {
            if (config.current_latlng !== null && !map.getBounds().contains(config.current_latlng)) {
                map.closePopup();
            }
            var cnt = map.getCenter();
            ctxt.lat = cnt.lat;
            ctxt.lng = cnt.lng;
            permalink.set();
        });

        map.on('zoomstart', function(e) {
            var prev_zoom_level = map.getZoom();
            config.prev_zoom_level = prev_zoom_level;
        });

        map.on('zoomend', function(e) {
            var current_zoom_level = map.getZoom();
            ctxt.zoom = current_zoom_level;
            // update layer only if needed
            if (ctxt.selected_tab != 'escuela') {
                if (current_zoom_level <= config.hex_zoom_threshold) {
                    cdb.update_layer();
                }
            }
            config.prev_zoom_level = current_zoom_level;
            permalink.set();
        });

        // Close popup and overlay
        map.on('popupclose', function(e) {
            my_popup_close(e);
        });

        /** DRAW LAYER EVENTS */
        map.on('draw:drawstart', draw.drawstart);
        map.on('draw:drawstop', draw.drawstop);
        map.on('draw:deleted', draw_deleted);
        map.on('draw:created', draw_filter);
        map.on('draw:edited', draw_filter);

        d3.select("#overlay .cerrar" ).on("click", function(){ // close overlay
            map.closePopup();
            _self.overlay.fold();
        });
    
        /** crowdsource functionality */
        d3.select("input#submit").on("click", function() {
            var comment = d3.select("textarea#msg").node();
            if (ctxt.selected_polling) {
                fire_analytics_event("crowdsource",ctxt.selected_polling);
                cdb.send_crowdsource(ctxt.selected_polling, comment.value);
            }
            comment.value = "";
            d3.select("div.formu").classed("on", false);
        }, false);
    });
});