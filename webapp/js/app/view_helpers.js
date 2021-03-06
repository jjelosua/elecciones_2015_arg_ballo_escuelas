define(function (config) {
    //Formatting helper
    Number.prototype.format = function(c, d, t){
        var n = this;
        c = isNaN(c = Math.abs(c)) ? 2 : c;
        d = d === undefined ? "," : d;
        t = t === undefined ? "." : t;
        var s = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
        var nn = s + (j ? i.substr(0, j) + t : "") + 
                     i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
                     (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
        return nn;
    };

    return {
        get_candidato_apellido_class: function(d, dict) {
            return dict[d.id_partido] ? dict[d.id_partido].cand_foto : "";
        },
        get_candidato_nombre: function(d, dict) {
            return dict[d.id_partido] ? dict[d.id_partido].cand_corto : "";
        },
        get_candidato_color: function(d, dict) {
            return dict[d.id_partido] ? dict[d.id_partido].color_partido : "";
        },
        get_formatted_pct: function(num,den,c,d,t) {
            return ((+num / +den)*100).format(c, d, t);
        },
        get_formatted_num: function(num,c,d,t) {
            return (+num).format(c, d, t);
        },
        get_partido: function(d,dict) {
            return dict[d.id_partido] ? dict[d.id_partido].nombre_corto : "";
        },
        get_url: function(key) {
            var k = key.split("-")[2];
            var items = k.split("_");
            var url = "http://www.resultados.gob.ar/bltgetelegr/";
            url += items[0];
            url += "/";
            url += items[1];
            url += "/";
            url += items[2];
            url += "/";
            url += items[3];
            if (items.length == 5) {
                url += "_"+items[4]+".htm";
            }
            else {
                url +=".htm";
            }
            console.log(url);
            return url;
        },
        get_mesa: function(key) {
            return key.slice(-4);
        },
        get_dc_telegram_id: function(dc_id, dc_title) {
            var telegram_id = dc_id+"-"+dc_title;
            return telegram_id;
        },
        get_dc_id: function(key) {
            return key.split("-")[1];
        },
        get_dc_complete_id: function(key) {
            return key.slice(2);
        },
        get_key_telegrama: function(key) {
            return key.split("-")[2].toLowerCase();
        }
    };
});