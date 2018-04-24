/* 
    PersonCentredSoftware Limited

    This namespace will contain all our wrapper functions
*/

var PcsComponents = (function () {

    var deferred = $.Deferred(); 
    var guid;
    var _baseURL = 'https://staticcontent.personcentredsoftware.com';
    var _providerURL = window.location + "//" + window.location.hostname;
    var passwordResetURL = _providerURL + '/Home/ResetPassword';
    var initialised = false;

    // Login error codes
    var loginErrors = {
        pcsErr1: "Authentication error - try again?",
        pcsErr2: "Nothing to display", // Authenticated but no permissions to see anything
        pcsErr3: "Nothing to display",  // No relationships to this user in this care home
        pcsErr4: "Authentication error", // Please contact PCS support
        pcsErr5: "ProviderID not sent", // ProviderId is not sent or is invalid
        pcsErr6: "Unrecognised originating domain", // Referer domain not in the whitelist
        pcsErr7: "Provider not authorised to use Relatives' Gateway",  // Provider does not have access to RelativesGateway
        pcsErr8: "Nothing to display", // Please try again in 1 hour, and if still having problems get in touch with PCS support
    };


    // Call ajax
    function ajax(url, id, successCallback, errCallback, urlData) {

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.withCredentials = true;

        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status === 200) {
                    if (successCallback === undefined)
                        ajaxOnSuccess(id, xmlhttp.responseText);
                    else
                        successCallback(id, xmlhttp.responseText);
                }
                else {
                    if (errCallback === undefined)
                        ajaxOnError(id);
                    else
                        errCallback(id);
                }
            }
        };

        ajaxLoading(id);

        xmlhttp.open("GET", url + '/' + guid + (urlData ? urlData : ''), true);
        xmlhttp.send();
    }

    // Loading
    function ajaxLoading(id) {
        $('#' + id).empty().addClass('pcs-loading');
    }

    // Handle success
    function ajaxOnSuccess(id, content) {
        var obj = $('#' + id);
        obj.hide().removeClass('pcs-loading').html(content).fadeIn();
        obj.find('.pcs-component').addClass('pcs-content');
    }

    // Handle error
    function ajaxOnError(id) {
        $('#' + id).hide().removeClass('pcs-loading').html('<div class="error">Could not load component :(</div>').fadeIn().find('.pcs-component').addClass('pcs-content');
    }

    // Login component onSuccess
    function loginOnSuccess(id, content) {
        ajaxOnSuccess(id, content);

        if (content.indexOf('name="UserName"') >= 0) {
            expireAuthCookie();
        } else {
            setAuthCookie();
        }

        $('#' + id).find('a.pcs-logout').bind('click', function (e) {
            e.preventDefault();
            expireAuthCookie();
            window.location = $(this).attr('href');
        });

        // Read error from the response URL
        var hash = window.location.href.split("#")[1];
        if (hash !== undefined) {
            if (loginErrors[hash] !== undefined) {
                $('#' + id).find('.pcs-errors').html(loginErrors[hash]);
            }
        }

        // If there is a list of relatives, add on-change event to submit the page
        if (content.indexOf('</select>')) {
            $('#' + id).find('select').bind('change', function () {
                $(this).closest('form').submit();
            });
        }

        // Reset password
        var width = window.innerWidth / 3;
        width = (width > 500 ? 500 : width);

        var resetPasswordDialog = $('#pcs-reset-password-window').dialog({
            autoOpen: false,
            modal: true,
            width: 500,
            buttons: {
                "Reset password": function () {

                    var t = $(this);
                    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
                    var email = t.find('input[type=email]').val();

                    if (email.length == 0 || !regex.test(email)) {
                        t.find('input[type=email]').addClass('pcs-error');
                    } else {
                        t.find('input[type=email]').removeClass('pcs-error');
                        t.find('button').attr('disabled', 'disabled');

                        // Submit the reset password request.
                        $.ajax({
                            url: _baseURL + '/MCM/ProviderComponent/RegeneratePassword/' + guid,
                            method: "post",
                            data: { email: email, successReturnUrl: passwordResetURL },
                            success: function () {

                                resetPasswordDialog.dialog("close");

                                $('#pcs-reset-password-confirmation-window').dialog({
                                    autoOpen: true,
                                    modal: true,
                                    width: 500
                                });
                            },
                            error: function () {
                                resetPasswordDialog.find('button').removeAttr('disabled');
                                resetPasswordDialog.find('.error-message').slideDown();
                            }
                        });
                    }
                },
                Cancel: function () {
                    $(this).dialog("close");
                    clearDialog();
                }
            },
            close: function () {
                clearDialog();
            }
        });

        var clearDialog = function () {
            var dialog = $('#pcs-reset-password-window');
            dialog.find('.error-message').hide();
            dialog.find('input').val('').removeClass('pcs-error');
            dialog.find('button').removeAttr('disabled');
        };

        $('#pcs-reset-password').bind('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            resetPasswordDialog.dialog("open");
        });
    }




    // Cookie management
    var cookieName = "PCSRGAUTH";
    function setAuthCookie() {
        var reload = !isAuthenticated();
        var d = new Date();

        d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cookieName + "=YES; " + expires;

        if (reload)
            window.location = _providerURL;
    }

    function expireAuthCookie() {
        document.cookie = cookieName + "=YES; expires=Thu, 01 Jan 1970 00:00:01 UTC";
    }

    function isAuthenticated() {
        return document.cookie.indexOf(cookieName + "=") >= 0;
    }

    /// Reset password methods
    var loadResetPasswordOnSuccess = function (id, content) {
        ajaxOnSuccess(id, content);

        // Turn form into ajax submission
        var obj = $('#' + id);
        var form = obj.find('form');
        var btn = form.find('input[type=submit]');

        btn.click(function (e) {
            e.preventDefault();
            e.stopPropagation();

            obj.addClass('pcs-loading');

            $.ajax({
                url: form.attr('action'),
                method: form.attr('method'),
                data: form.serialize(),
                success: function (response) {
                    loadResetPasswordOnSuccess(id, response);
                },
                error: function () {
                    obj.removeClass('pcs-loading');
                }
            });
        });
    };

    var loadResetPasswordOnError = function (id, content) {
        window.location = _providerURL;
    }


    // Singleton instance that exposes all the methods
    var wrapper = {

        guid: function () {
            return providerId;
        },

        isAuthenticated: function () {
            return isAuthenticated();
        },

        loadLogin: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/login", containerId, loginOnSuccess);
        },

        loadCareSummary: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/CareSummary", containerId);
        },

        loadDailyPlan: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/DailyPlan", containerId);
        },

        loadDailyCare: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/DailyCare", containerId);
        },

        loadActivitiesChart: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/ActivitiesChart", containerId);
        },

        loadHygieneChart: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/HygieneChart", containerId);
        },

        loadFluidChart: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/FluidChart", containerId);
        },

        loadCareHoursPerAdl: function (containerId) {
            if (typeof (kendo) == "undefined") {
                $LAB
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.dataviz.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                    .wait(function () {
                        ajax(_baseURL + "/MCM/ProviderComponent/CareHoursPerAdl", containerId);

                    });

            }
            else {
                ajax(_baseURL + "/MCM/ProviderComponent/CareHoursPerAdl", containerId);
            }
        },

        loadCareNotesPerDay: function (containerId) {
            if (typeof (kendo) == "undefined") {
                $LAB
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.dataviz.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                    .wait(function () {
                        ajax(_baseURL + "/MCM/ProviderComponent/CareNotesPerDay", containerId);

                      });

                    }
            else {
                ajax(_baseURL + "/MCM/ProviderComponent/CareNotesPerDay", containerId);
                }
        },

        loadPortrait: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/Portrait", containerId);
        },

        loadHappiness: function (containerId) {
            ajax(_baseURL + "/MCM/ProviderComponent/Happiness", containerId);
        },

        loadCompleteCarePlanDocument: function (containerId) {
            var url = _baseURL + '/MCM/ProviderComponent/CompleteCarePlanDocument/' + guid;
            window.open(url, '_blank');
        },

        loadMessenger: function (containerId) {
            $LAB.setOptions({AllowDuplicates:false})
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe-ui-default.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PhotoSwipe/GalleryLoader.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PicEdit/js/picedit.js", type: "text/javascript" })
                    .wait(function () {
                        ajax(_baseURL + "/MCM/ProviderComponent/Messenger", containerId);
                    });
        },

        loadGallery: function (containerId) {
            $LAB.setOptions({ AllowDuplicates: false })
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe-ui-default.min.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PhotoSwipe/GalleryLoader.js", type: "text/javascript" })
                    .script({ src: _baseURL + "/MCM/scripts/" + "PicEdit/js/picedit.js", type: "text/javascript" })
                    .wait(function () {
                        ajax(_baseURL + "/MCM/ProviderComponent/Gallery", containerId);
                    });
        },

        hasCareInformationAccess: function (callback) {
            ajax(_baseURL + "/MCM/ProviderComponent/hasAccessToCareInformation", "",
                function (id, content) { callback(JSON.parse(content)); },
                function () { callback(false); }
                );
        },

        loadResetPassword: function (containerId) {
            var query = window.location.search.substring(1);

            if (query.indexOf("token=") !== false) {
                var urlParams = query.split("&");
                for (var i in urlParams) {
                    if (urlParams[i].indexOf("token=") !== 0) continue;

                    ajax(_baseURL + "/MCM/ProviderComponent/ResetPassword", containerId, loadResetPasswordOnSuccess, loadResetPasswordOnError, "?" + urlParams[i] + "&returnurl=" + escape(_providerURL));
                    return;
                }
                window.location = _providerURL;
            }
        }

    }

    return {
        getInstance: function (providerId) {
            if (providerId === undefined || providerId.length !== 36)
                throw new Exception('Provider ID is required');

            guid = providerId;

            if (initialised == false) {
                // Load kendo libraries and css - method recommended by Google/PageSpeed
                initialised = true;

                $.ajax({
                    url: _baseURL + "/MCM/scripts/LAB.min.js",
                    dataType: "script",
                    cache: true,
                    success: function () {
                        deferred.resolve(wrapper);
                    }
                });
            }
            //console.log("Returning promise of wrapper");
            return deferred.promise(wrapper);
        },
        config: function (obj) {
            // You should never need to change this URL unless you're running in the development/testing environment
            if (obj.baseURL) {
                _baseURL = obj.baseURL;
            }

            if (obj.providerURL) {
                _providerURL = obj.providerURL;
                passwordResetURL = _providerURL + '/Home/ResetPassword';
            }

            if (obj.passwordResetURL) {
                passwordResetURL = obj.passwordResetURL;
            }
        }
    };

})();