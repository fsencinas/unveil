/**
 * Unveil-E "Enhanced"
 * 
 * A very lightweight jQuery plugin to lazy load images
 * Based on http://luis-almeida.github.com/unveil
 *
 * This is an enhanced version from Luis Almeida's Unveil
 * featuring multiple screen densities,
 * some optimisations for better performance,
 * and low garbage memory saving.
 *
 * Licensed under the MIT license.
 * Copyright 2016 Francisco Sánchez Encinas
 * https://github.com/fsencinas
 */

(function($) {

    var $w = $(window),
        images = [],
        $batch = $(),
        initialised = false,
        ticking = false,
    // common density buckets
    // (Keys are used as suffix for data-src-[density] and checking device pixel ratio)
        densities = {tvdpi: 1.33, hdpi: 1.5, xhdpi: 2, retina: 2, xxhdpi: 3, xxxhdpi: 4};

    // RAF fallback initial timing stuff
    var now = Date.now || function(){return new Date().getTime();},
        startTime = now(),
        lastTime  = startTime;

    // requestAnimationFrame
    var raf = window.requestAnimationFrame ||
              window.mozRequestAnimationFrame ||
              window.webkitRequestAnimationFrame || function(fn) {
                  var currTime = now(),
                      delay    = Math.max(0, 16 - (currTime - lastTime));
                  return window.setTimeout(function() {
                      lastTime = now();
                      fn(lastTime - startTime);
                  }, delay);
              };

    // html5 visibility API
    var docHiddenProp = $.map(["hidden", "mozHidden", "webkitHidden"], function(p){
            return typeof document[p] !== "undefined" ? p : null;
        })[0] || "",
        visibilityChange = docHiddenProp.replace(/[H|h]idden/, '') + 'visibilitychange';

    // screen pixel density
    var getDensity = function(){
        var ret = [],
            dpr = parseFloat((window.devicePixelRatio || 0).toFixed(2));
        $.each(densities, function(d, r){
            if (r === dpr) ret.push(d);
        });
        return ret;
    };

    var inview = function() {
        var wt = $w.scrollTop()   | 0,
            wb = wt + $w.height() | 0;

        return $batch.filter(function() {
            var $img = $(this);
            if ($img.is(":hidden")) return;

            var th = $img.data("threshold"),
                et = $img.offset().top    | 0,
                eb = (et + $img.height()) | 0;

            return eb >= wt - th && et <= wb + th;
        });
    };

    var unveil = function() {
        if (!$batch.length) {
            $w.off(".unveil");
            initialised = false;
            return;
        }
        var $unveiled = inview().trigger("unveil");
        $batch = $batch.not($unveiled);
    };

    var lookup = function(){
        unveil();
        ticking = false;
    };

    var throttle = function(e){
        if (!ticking) {
            raf(lookup);
        }
        ticking = true;
    };

    // purge pool images not longer alive in DOM
    var updatePool = function(){
        return images = $.grep(images, function(img){
            if ($.contains(document.documentElement, img)) return img;
        });
    };

    // plugin definition
    $.fn.unveil = function(threshold, callback) {

        var screenDensity = getDensity();
        this.data("threshold", (threshold || 0) | 0);

        // pre update pool
        images.length && updatePool();

        // get only new images not already unveiled
        var $images = this.filter(function(){
            if ($.inArray(this, images) === -1) {
                return this;
            }
        }).one("unveil", function(){
            var $this = $(this);
            var source = $.map(screenDensity, function(d) {
                return $this.attr("data-src-" + d) || null;
            })[0] || $this.attr("data-src");

            if (source) {
                $this.attr("src", source);
                if (typeof callback === "function") {
                    callback.call(this);
                }
            }
        });

        $.merge(images, $images.get());
        $batch = $batch.add($images);

        if (!initialised) {
            $w.on("lookup.unveil scroll.unveil resize.unveil", throttle);

            // provide a mechanism to resume on tab change
            // due rAf rate may be reduced or eventually paused when running in background tabs
            docHiddenProp && $w.on(visibilityChange + ".unveil", function(){
                if (!document[docHiddenProp]) unveil();
            });

            initialised = true;
        }

        unveil();

        return $images;
    };

}(window.jQuery || window.Zepto));