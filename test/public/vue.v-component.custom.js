(function() {

    var hasBrokenTemplate = (function () {
        var a = document.createElement('div')
        a.innerHTML = '<template>1</template>'
        return !a.cloneNode(true).firstChild.innerHTML
    })()


    var clone = function (node) {
        var res = node.cloneNode(true)
        /* istanbul ignore if */
        if (hasBrokenTemplate) {
            var templates = node.querySelectorAll('template')
            if (templates.length) {
                var cloned = res.querySelectorAll('template')
                var i = cloned.length
                while (i--) {
                    cloned[i].parentNode.replaceChild(
                        templates[i].cloneNode(true),
                        cloned[i]
                    )
                }
            }
        }
        return res
    }


    Vue.directive('component', {

        isLiteral: true,

        /**
         * Setup. Two possible usages:
         *
         * - static:
         *     v-component="comp"
         *
         * - dynamic:
         *     v-component="{{currentView}}"
         */

        bind: function () {
            if (!this.el.__vue__) {
                // create a ref anchor
                this.ref = document.createComment('v-component')
                Vue.util.replace(this.el, this.ref)
                // check keep-alive options
                this.checkKeepAlive()
                // check parent directives
                this.parentLinker = this.el._parentLinker
                // if static, build right now.
                if (!this._isDynamicLiteral) {
                    this.resolveCtor(this.expression)
                    this.build();
                }
            } else {
                console.log(
                    'v-component="' + this.expression + '" cannot be ' +
                    'used on an already mounted instance.'
                )
            }
        },

        /**
         * Check if the "keep-alive" flag is present.
         * If yes, instead of destroying the active vm when
         * hiding (v-if) or switching (dynamic literal) it,
         * we simply remove it from the DOM and save it in a
         * cache object, with its constructor id as the key.
         */

        checkKeepAlive: function () {
            // check keep-alive flag
            this.keepAlive = this.el.hasAttribute('keep-alive')
            if (this.keepAlive) {
                this.el.removeAttribute('keep-alive')
                this.cache = {}
            }
        },

        /**
         * Resolve the component constructor to use when creating
         * the child vm.
         */

        resolveCtor: function (id) {
            this.ctorId = id
            this.Ctor = this.vm.$options.components[id]
            Vue.util.assertAsset(this.Ctor, 'component', id)
        },

        /**
         * Instantiate/insert a new child vm.
         * If keep alive and has cached instance, insert that
         * instance; otherwise build a new one and cache it.
         */

        build: function () {
            if (this.keepAlive) {
                var cached = this.cache[this.ctorId]
                if (cached) {
                    this.childVM = cached
                    cached.$before(this.ref)
                    return
                }
            }
            var vm = this.vm
            if (this.Ctor && !this.childVM) {

                console.log('---------------')

                // for (var item in this.Ctor) {
                //     console.log(item, this.Ctor[item])

                // }

                setTimeout(function() {
                    console.log(this.Ctor.options.defaultData)
                }.bind(this), 0)


                if (this.Ctor.options.defaultData) {
                    if (!this.Ctor.options.__data) {
                        this.Ctor.options.__data = this.Ctor.options.data;
                    }

                    this.Ctor.options.data = function() {
                        return _.extend(
                            this.Ctor.options.__data(),
                            this.Ctor.options.defaultData
                        );
                    }.bind(this);
                }


                this.childVM = vm.$addChild({
                    el: clone(this.el)
                }, this.Ctor)
                if (this.parentLinker) {
                    var dirCount = vm._directives.length
                    var targetVM = this.childVM.$options.inherit
                        ? this.childVM
                        : vm
                    this.parentLinker(targetVM, this.childVM.$el)
                    this.parentDirs = vm._directives.slice(dirCount)
                }
                if (this.keepAlive) {
                    this.cache[this.ctorId] = this.childVM
                }
                this.childVM.$before(this.ref)
            }
        },


        /**
         * Teardown the active vm.
         * If keep alive, simply remove it; otherwise destroy it.
         *
         * @param {Boolean} remove
         */

        unbuild: function (remove) {             
            var child = this.childVM
            if (!child) {
                return
            }
            if (this.keepAlive) {
                if (remove) {
                    child.$remove()
                }
            } else {
                child.$destroy(remove)
                var parentDirs = this.parentDirs
                if (parentDirs) {
                    var i = parentDirs.length
                    while (i--) {
                        parentDirs[i]._teardown()
                    }
                }
            }
            this.childVM = null
        },

        /**
         * Update callback for the dynamic literal scenario,
         * e.g. v-component="{{view}}"
         */

        update: function (value) {
            this.unbuild(true)
            if (value) {
                this.resolveCtor(value)
                this.build()
            }
        },

        /**
         * Unbind.
         * Make sure keepAlive is set to false so that the
         * instance is always destroyed.
         */

        unbind: function () {
            this.keepAlive = false
            this.unbuild()
        }

    })


})();