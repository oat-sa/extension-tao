/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2018 (original work) Open Assessment Technologies SA ;
 */

/**
 * Test Previewer Responsive Scale plugin : Scale
 *
 */
define([
    'jquery',
    'lodash',
    'i18n',
    'ui/hider',
    'taoTests/runner/plugin',
    'taoQtiTestPreviewer/previewer/utils/devices',
    'tpl!taoQtiTestPreviewer/previewer/plugins/tools/scale/preview-types',
    'tpl!taoQtiTestPreviewer/previewer/plugins/tools/scale/mobile-devices',
    'tpl!taoQtiTestPreviewer/previewer/plugins/tools/scale/desktop-devices',
    'tpl!taoQtiTestPreviewer/previewer/plugins/tools/scale/scale-wrapper',
    'css!taoItemsCss/preview'
], function (
    $,
    _,
    __,
    hider,
    pluginFactory,
    devices,
    previewTypesTpl,
    mobileDevicesTpl,
    desktopDevicesTpl,
    scaleWrapperTpl,
) {
    'use strict';

    var overlay;
    var orientation = 'landscape';
    var DEFAULT_TYPE = 'standard';
    var selectedDevice = 'standard';
    var deviceTypes = {
            desktop: __('Desktop preview'),
            mobile: __('Mobile preview'),
            standard: __('Actual size')
        };
    var $window = $(window);
    var screenSize = {
        width: $window.innerWidth(),
        height: $window.innerHeight()
    };
    var sizeSettings = {
        width: 0,
        height: 0
    };
    var devicesToControls = {
        'mobile': '$mobileDevices',
        'desktop': '$desktopDevices',
        'standard': '$deviceTypes'
    };
    var _getPreviewTypes = function () {
        var options = [];
        _(deviceTypes).forEach(function (_deviceLabel, _deviceType) {
            options.push({
                value: _deviceType,
                label: _deviceLabel,
                selected: selectedDevice === _deviceType
            });
        });
        return options;
    };
    var controls;
    var testRunner;
    var api = {
        /**
         * Tells if the component is enabled
         * @returns {Boolean}
         */
        isPluginAllowed: function isPluginAllowed() {
            var config = testRunner.getConfig();
            return !config.readOnly;
        },
        /**
         * Show particular control and hide other except of the default visible control
         * @param {String} controlName - name of the particular control to show
         * @param {String} action - name of the particular control to show - [hide,show]
         */
        toggleControl: function toggleControl(controlName) {
            var $control = controls[controlName];

            if($control){
                _.forEach(controls, function ($control, name) {
                    if( name === controlName || name === devicesToControls[DEFAULT_TYPE]){
                        hider.show($control);
                    } else{
                        hider.hide($control);
                    }
                });

            }else{
                throw new TypeError('toggleControl method MUSt have parameter "controlName"');
            }
        },
        /**
         * manipulates controls visibility on page according to given preview type
         * @param {String} deviceType - type of supposed device screen ['mobile','desktop', 'standard']
         */
        composeControlsByDeviceType: function composeControlsByDeviceType(deviceType){
            var controlName = devicesToControls[deviceType] ? devicesToControls[deviceType] : DEFAULT_TYPE;
            this.toggleControl(controlName);
        },
        /**
         * change device imitation frame
         * @param {String} deviceType
         * @param {Boolean} isReplacing param shows whether to to replace previously made wrapper
         */
        changeDeviceFrame: function changeDeviceFrame(deviceType, isReplacing) {
            if(isReplacing && controls.$scaleWrapper){
                this.removeDeviceFrame();
            }
            var $content = testRunner.getAreaBroker().getContentArea();
            var $children = $content.children().detach();
            controls.$scaleWrapper = $(scaleWrapperTpl({
                type:deviceType
            }));
            controls.$scaleWrapper.find('.preview-item-container').append($children);
            controls.$scaleWrapper.css('display', 'block');
            $content.append(controls.$scaleWrapper);
            this.positionPreview();

        },
        /**
         * removes previewer content ot its initial state without device frame and scaling (Actual size )
         */
        removeDeviceFrame: function removeDeviceFrame() {
            var $children = controls.$scaleWrapper.find('.preview-item-container').children().detach();
            var $content = testRunner.getAreaBroker().getContentArea();
            $content.empty();
            $content.append($children);
            controls.$scaleWrapper = null;
        },
        /**
         * Setting up screen size according preview viewport size
         * @private
         */
        setupScreenSize: function setupScreenSize() {
            screenSize = {
                width: controls.$scaleWrapper.innerWidth(),
                height: controls.$scaleWrapper.innerHeight()
            };
        },
        /**
         * Set the size for the standard preview
         * @param height
         * @private
         */
        updateStandardPreviewSize: function updateStandardPreviewSize(height) {
            var $selector = controls.$mobileDevices.children('.mobile-device-selector'),
                values = ($selector.val() ? $selector.val().split(',') : '') || [$window.width().toString()],
                valueStr = values.join(',');

            values[1] = height || values[1] || '1200';

            $selector.val(valueStr).data('value', valueStr);
        },
        /**
         * Compute scale factor based on screen size and device size
         *
         * @private
         */
        computeScaleFactor: function computeScaleFactor() {
            var scaleFactor = 1;

            var scaleValues = {
                x: 1,
                y: 1
            };

            // 150/200 = device frames plus toolbar plus console plus some margin

            var requiredSize = {
                width: sizeSettings.width + 150,
                height: sizeSettings.height + 275
            };

            if (requiredSize.width > screenSize.width) {
                scaleValues.x = screenSize.width / requiredSize.width;
            }

            if (requiredSize.height > screenSize.height) {
                scaleValues.y = screenSize.height / requiredSize.height;
            }
            scaleFactor = Math.min(scaleValues.x, scaleValues.y);

            return scaleFactor;
        },
        /**
         * Scale devices down to fit screen
         * @private
         */
        scaleFrame: function scale() {
            var scaleFactor = this.computeScaleFactor();

            var $scaleContainer = controls.$scaleWrapper.find('.preview-scale-container'),
                _scaleFactor = selectedDevice === 'standard' ? 1 : scaleFactor,
                containerScaledWidth = $scaleContainer.width() * _scaleFactor,
                left = (screenSize.width - containerScaledWidth) / 2;

            $scaleContainer.css({
                left: left > 0 ? left : 0,
                '-webkit-transform': 'scale(' + _scaleFactor + ',' + _scaleFactor + ')',
                '-ms-transform': 'scale(' + _scaleFactor + ',' + _scaleFactor + ')',
                'transform': 'scale(' + _scaleFactor + ',' + _scaleFactor + ')',
                '-webkit-transform-origin': '0 0',
                '-ms-transform-origin': '0 0',
                'transform-origin': '0 0'
            });
        },
        /**
         * position the preview depending on the height of the toolbar
         *
         * @private
         */
        positionPreview: function positionPreview() {
            var topBarHeight = testRunner.getAreaBroker().getHeaderArea().outerHeight();

            controls.$scaleWrapper.css('top', topBarHeight+ 'px');
            controls.$scaleWrapper.css('max-height', 'calc(100vh - ' + topBarHeight + 'px )');
        },

        setOrientation: function setOrientation(newOrientation) {
            var re;
            var previewFrame;

            if (newOrientation === orientation) {
                return;
            }

            re = new RegExp(orientation, 'g');
            previewFrame = controls.$scaleWrapper.find('.preview-outer-frame')[0];

            previewFrame.className = previewFrame.className.replace(re, newOrientation);

            // reset global orientation
            orientation = newOrientation;
        },
        onDeviceChange: function onDeviceChange(event){
            var element = event.target;
            var type = selectedDevice;
            var val = element.value.split(',');
            var i = val.length;
            var container = controls.$scaleWrapper.find('.' + type + '-preview-container');

            while (i--) {
                val[i] = parseFloat(val[i]);
            }
            if (type === 'mobile' && orientation === 'portrait') {
                sizeSettings = {
                    width: val[1],
                    height: val[0]
                };
            }
            else {
                sizeSettings = {
                    width: val[0],
                    height: val[1]
                };
            }

            if (sizeSettings.width === container.width() && sizeSettings.height === container.height()) {
                return false;
            }

            container.css(sizeSettings);
            this.scaleFrame();
        },
        onOrientationChange: function onOrientationChange(event) {
            var element = event.target;
            var type = selectedDevice;
            var container = controls.$scaleWrapper.find('.' + type + '-preview-container');
            var newOrientation = element.value;

            if (newOrientation === orientation) {
                return false;
            }
            sizeSettings = {
                height: container.width(),
                width: container.height()
            };

            container.css(sizeSettings);

            this.setOrientation(newOrientation);
            this.scaleFrame();
        },
        onDeviceTypeChange: function onDeviceTypeChange(event) {
            var element = event.target;
            selectedDevice = element.value;
            this.composeControlsByDeviceType(element.value);
            if(element.value === DEFAULT_TYPE){
                this.removeDeviceFrame();
            }else{
                this.changeDeviceFrame(element.value, true);
                this.scaleFrame();
                this.setupScreenSize();
                if (element.value === 'mobile'){
                    controls.$mobileDevices.children('.mobile-device-selector').get(0).dispatchEvent(new Event('change'));
                } else if( element.value === 'desktop'){
                    controls.$desktopDevices.get(0).dispatchEvent(new Event('change'));
                }

            }
        }

    };

    return pluginFactory({

        name: 'scale',

        /**
         * Initialize the plugin (called during runner's init)
         */
        init: function init() {
            var self = this;
            testRunner = this.getTestRunner();


            controls = this.controls = {
                $deviceTypes: $(previewTypesTpl({
                    items: _getPreviewTypes(),
                })),
                $mobileDevices: $(mobileDevicesTpl({
                    items: devices.byType('mobile'),
                })),
                $desktopDevices: $(desktopDevicesTpl({
                    items: devices.byType('desktop'),
                }))
            };


            /**
             *  when user changes device type he/she want to test item in
             *  @event preview-scale-device-type
             */
           this.controls.$deviceTypes.get(0).addEventListener('change', function (event) {
               api.onDeviceTypeChange(event);
               self.trigger('preview-scale-device-type', event.target.value);

           });

            /**
             *  when user changes mobile device model he/she want to test item in
             *  @event preview-scale-device-mobile-type
             */
            this.controls.$mobileDevices.children('.mobile-device-selector').get(0).addEventListener('change', function (event) {
                api.onDeviceChange(event);
                self.trigger('preview-scale-device-mobile-type', event.target.value);

            });

            /**
             *  when user changes mobile device screen orientation user want to test item in
             *  @event preview-scale-device-mobile-orientation-type
             */
            this.controls.$mobileDevices.children('.mobile-orientation-selector').get(0).addEventListener('change', function (event) {
                api.onOrientationChange(event);
                self.trigger('preview-scale-device-mobile-orientation-type', event.target.value);
            });

            /**
             *  when user changes mobile device model he/she want to test item in
             *  @event preview-scale-device-desktop-type
             */
            this.controls.$desktopDevices.get(0).addEventListener('change', function (event) {
                api.onDeviceChange(event);
                self.trigger('preview-scale-device-desktop-type', event.target.value);
            });
            /**
             * adjust device frame position and size when browser size change
             */

            $window.on('resize orientationchange', function () {
                if(controls.$scaleWrapper){
                    api.setupScreenSize();
                    api.updateStandardPreviewSize();
                    api.scaleFrame();
                }
            });

            this.disable();

            testRunner
                .on('render', function () {
                    if (api.isPluginAllowed()) {
                        api.composeControlsByDeviceType(DEFAULT_TYPE);
                    } else {
                        self.hide();
                    }
                })
                .on('enablenav', function () {
                    self.enable();
                })
                .on('disablenav', function () {
                    self.disable();
                });
        },

        /**
         * Called during the runner's render phase
         */
        render: function render() {

            //attach the element to the navigation area
            var $headerControls = this.getAreaBroker().getHeaderArea();
            $headerControls.append(this.controls.$deviceTypes);
            $headerControls.append(this.controls.$mobileDevices);
            $headerControls.append(this.controls.$desktopDevices);

        },

        /**
         * Called during the runner's destroy phase
         */
        destroy: function destroy() {
            _.forEach(this.controls, function ($el) {
                $el.remove();
            });
            this.controls = null;
        },

        /**
         * Enable default controls
         */
        enable: function enable() {
            this.controls.$deviceTypes.removeProp('disabled').removeClass('disabled');
        },

        /**
         * Disable default controls
         */
        disable: function disable() {
            this.controls.$deviceTypes.prop('disabled', true).addClass('disabled');
        },

        /**
         * Show default controls
         */
        show: function show() {
            hider.show(this.controls.$deviceTypes);
        },

        /**
         * Hide default controls
         */
        hide: function hide() {
            hider.hide(this.controls.$deviceTypes);

        }



    });
});
