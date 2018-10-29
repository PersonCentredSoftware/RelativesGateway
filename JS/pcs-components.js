/* 
    Person Centred Software Limited
    https://github.com/PersonCentredSoftware/RelativesGateway
    Version 1.0.1
*/

var PcsComponents = (function () {

    var deferred = $.Deferred();
    var _providerId;
    var _contentURL = 'https://staticcontent.personcentredsoftware.com';
    var _baseURL = 'https://monitor.personcentredsoftware.com';
    var _providerURL = window.location + "//" + window.location.hostname;
    var passwordResetURL = _providerURL + '/Home/ResetPassword';
    var initialised = false;

    function _ajax(method, url, containerId, urlData, deferred) {

        var xmlhttp = new XMLHttpRequest();

        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status === 200) {
                    deferred.resolve(containerId, xmlhttp.responseText);
                }
                else if (xmlhttp.status === 202) {
                    setAccessInfoToStorage(null);
                    deferred.resolve(containerId, xmlhttp.responseText);
                }
                else {
                    deferred.reject(containerId, xmlhttp.responseText);
                }
            }
        };

        if (containerId)
            _ajaxLoading(containerId);

        xmlhttp.open(method, url + '/' + _providerId + (method == "GET" && urlData ? '?' + _serialize(urlData) : ''), true);
        var ticket = getTicketFromStorage();
        if (ticket) {
            xmlhttp.setRequestHeader("X-PCSAuth", ticket);
        }

        if (method == "POST") {
            if (urlData && urlData["pcs_aft"])
                xmlhttp.setRequestHeader("X-PCSAFT", urlData["pcs_aft"]);

            xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xmlhttp.send(_serialize(urlData));
        }
        else {
            xmlhttp.send();
        }
    }

    // Loading
    function _ajaxLoading(id) {
        if (!id) return;
        $('#' + id).empty().addClass('pcs-loading');
    }

    // Handle success
    function _ajaxOnSuccess(id, content) {
        if (!id) return;

        var obj = $('#' + id);
        obj.hide().removeClass('pcs-loading').html(content).fadeIn();
        obj.find('.pcs-component').addClass('pcs-content');
    }

    // Handle error
    function _ajaxOnError(id, response) {
        console.log("_ajaxOnError: " + response);
        if (!id) return;

        $('#' + id).hide().removeClass('pcs-loading').html('<div class="error">Could not load component :(</div>').fadeIn().find('.pcs-component').addClass('pcs-content');
    }

    function _serialize(obj) {
        var str = [];
        for (var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
        return str.join("&");
    }

    // Session/storage
    function getAccessInfoFromStorage() {
        var result = null;
        var key = "CareInformationAccess";
        try {
            result = JSON.parse(localStorage.getItem(key));

            if (result) {
                if (!result.__Expires || isNaN(parseInt(result.__Expires)) || parseInt(result.__Expires) < new Date().valueOf()) {
                    setAccessInfoToStorage(null);
                    result = null;
                }
            }


        } catch (e) {
            console.log(e);
        }

        return result;
    }

    function setAccessInfoToStorage(value, expiryMin) {
        "use strict"
        var key = "CareInformationAccess";

        if (value && value.Ticket) {
            if (value.Authenticated) 
                localStorage.setItem("PCSTicket", value.Ticket);
            else
                localStorage.removeItem("PCSTicket");

            delete value.Ticket;
        }


        if (value === null || value === undefined)
            localStorage.removeItem(key);
        else {
            if (expiryMin === undefined) expiryMin = 30;
            value.__Expires = new Date().valueOf() + 60000 * expiryMin;

            localStorage.setItem(key, JSON.stringify(value));
        }

    }

    // Session/storage
    function getTicketFromStorage() {
        var result = null;
        var key = "PCSTicket";
        try {
            result = localStorage.getItem(key);
        } catch (e) {
            console.log(e);
        }

        return result;
    }


    // Login component onSuccess
    function _loginOnSuccess(id, content) {

        $('#' + id).find('a.pcs-logout').bind('click', function (e) {
            e.preventDefault();
            window.location = $(this).attr('href');
        });

        //// Read error from the response URL
        //var hash = window.location.href.split("#")[1];
        //if (hash !== undefined) {
        //    if (loginErrors[hash] !== undefined) {
        //        $('#' + id).find('.pcs-errors').html(loginErrors[hash]);
        //    }
        //}

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
                "Reset password": function (e) {
                    "use strict"

                    var btn = $(e.currentTarget);
                    if (btn.attr("disabled")) return;

                    btn.html("Working... Please wait");
                    var t = $(this);
                    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
                    var email = t.find('input[type=email]').val();

                    if (email.length === 0 || !regex.test(email)) {
                        t.find('input[type=email]').addClass('pcs-error');
                    } else {
                        t.find('input[type=email]').removeClass('pcs-error');
                        t.find('button').attr('disabled', 'disabled');

                        (function () {
                            "use strict";
                            var deferred = $.Deferred();
                            var data = { email: email, successReturnUrl: passwordResetURL, pcs_aft: $('#' + id).find("#pcs_aft").val() };
                            _ajax("POST", _baseURL + "/MCM/ProviderComponent2/RegeneratePassword", null, data, deferred);
                            return deferred.promise();
                        })()
                        .then(function (containerId, content) {
                            "use strict"
                            btn.html("Reset password");
                            resetPasswordDialog.dialog("close");

                            $('#pcs-reset-password-confirmation-window').dialog({
                                autoOpen: true,
                                modal: true,
                                width: 500
                            });
                            return $.Deferred().resolve();
                        },
                        function (containerId, error) {
                            "use strict"
                            clearDialog();
                            btn.html("Reset password");
                            resetPasswordDialog.find('.error-message').slideDown();
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
            "use strict"
            var dialog = $('#pcs-reset-password-window');
            dialog.find('.error-message').hide();
            dialog.find('input').val('').removeClass('pcs-error');
            dialog.find('button').removeAttr('disabled');
        };

        $('#pcs-reset-password').bind('click', function (e) {
            "use strict"
            e.preventDefault();
            e.stopPropagation();
            resetPasswordDialog.dialog("open");
        });
    }

    // Reset password methods
    var loadResetPasswordOnSuccess = function (id, content) {
        _ajaxOnSuccess(id, content);

        // Turn form into _ajax submission
        var obj = $('#' + id);
        var form = obj.find('form');
        var btn = form.find('input[type=submit]');

        btn.click(function (e) {
            e.preventDefault();
            e.stopPropagation();

            obj.addClass('pcs-loading');

            (function () {
                    "use strict";
                var deferred = $.Deferred();
                var data = {
                    "pcs_aft": form.find("#pcs_aft").val(), "Password": form.find("#Password").val(), "RepeatPassword": form.find("#RepeatPassword").val(), "ProviderID": form.find("#ProviderID").val(), "Token": form.find("#Token").val(), "Email": form.find("#Email").val(), "ReturnUrl": form.find("#ReturnURL").val()};
                _ajax("POST", _baseURL + "/MCM/ProviderComponent2/ResetPassword", null, data, deferred);
                return deferred.promise();
            })()
            .then(function (containerId, content) {
                "use strict"
                loadResetPasswordOnSuccess(id, content);
                return $.Deferred().resolve();
            },
            function (containerId, error) {
                "use strict"
                obj.removeClass('pcs-loading');
                btn.html("Failed... Click to try again")
            });
        });
    };

    var loadResetPasswordOnError = function (id, content) {
        window.location = _providerURL;
    }

    // Singleton instance that exposes all the methods
    var wrapper = {

        // Helpers
        getProviderId: function () {
            return providerId;
        },

        getAccess: function () {
            // Returns JSON object with permission details
            var cached = getAccessInfoFromStorage();
            if (cached && cached.Authenticated) {
                console.log("FROM CACHE", cached);
                return $.Deferred().resolve(cached);
            }

            return (function () {
                var deferred = $.Deferred();
                _ajax("POST", _baseURL + "/MCM/ProviderComponent2/hasAccessToCareInformation", null, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {

                    var info = JSON.parse(content);
                    if (info && info.Authenticated) {
                        setAccessInfoToStorage(info);
                        console.log("SET TO CACHE", info);
                    }
                    else {
                        setAccessInfoToStorage(null);
                    }
                    return $.Deferred().resolve(info);
                });
        },
        loadLogin: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/Login", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    _loginOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },
        loadLoginIframe: function (containerId, afterlogincallback) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();

                // message from iframe on successful login
                window.addEventListener("message", receiveMessage, false);
                function receiveMessage(event) {

                    // Handle response
                    console.log("Message received", event);
                    var data = {};
                    try {
                        data = JSON.parse(event.data);
                    } catch (ex) { }

                    if (typeof (afterlogincallback) === "function") {
                        afterlogincallback(data);
                    }
                    else if (data.authenticated === true) {
                        window.location = window.location;
                    }
                }

                // Add iframe to the container
                $("#" + containerId).html('<iframe id="pcs-Login_iframe" src="' + _baseURL + "/MCM/ProviderComponent2/login/" + _providerId + '" scrolling="no"></iframe>');

                // When the content is loaded...
                $("#pcs-Login_iframe").on("load", function () {
                    return deferred.resolve(wrapper);
                });
                return deferred.promise();
            })()
                .then(function (containerId) {
                    //_loginOnSuccess(containerId, $(containerId).html());
                    return $.Deferred().resolve(wrapper);
                });
        },

        doLogin: function (username, password, token) {
            "use strict"
            var deferred = $.Deferred();
            // Basic validation
            var errors = [];
            if (!username || username.length < 5) {
                errors.push({ Key: "invalidemail", Value: "Please provide a valid email address" });
            }
            if (!password || password.length < 5) {
                errors.push({ Key: "invalidpassword", Value: "Please provide a valid password" });
            }
            if (!token || token.length < 5) {
                errors.push({ Key: "invalidtoken", Value: "Please provide a security verification token, which can be found inside the login container" });
            }

            if (_serialize(errors).length !== 0) {
                return deferred.resolve({ status: "error", errors: errors });
            }

            // Submit to server
            return (function () {

                var data = { username: username, password: password, pcs_aft: token};

                _ajax("POST", _baseURL + "/MCM/ProviderComponent2/LoginJson", null, data, deferred);
                return deferred.promise();
            })()
            .then(function (containerId, success) {

                var result = JSON.parse(success);
                if (result.authenticated === true && result.access) {
                    setAccessInfoToStorage(result.access);
                }
                return $.Deferred().resolve(JSON.parse(success));
            },
            function (containerId, errors) {
                return $.Deferred().resolve({ errors: [{ Key: "servererror", Value: errors ? "Error: " + errors + ". Please try refreshing the page" : "Server error, please notify the Customer Support" }] });
            });
        },

        doLogout: function () {
            "use strict"
            var deferred = $.Deferred();

            // Submit to server
            return (function () {
                _ajax("POST", _baseURL + "/MCM/ProviderComponent2/Logout", null, null, deferred);
                return deferred.promise();
            })().then(
            function () {
                setAccessInfoToStorage(null);
                localStorage.removeItem("PCSTicket");
                console.log("REMOVING CareInformationAccess");
                return $.Deferred().resolve(wrapper);
            },
            function (containerId, errors) {
                setAccessInfoToStorage(null);
                localStorage.removeItem("PCSTicket");
                console.log("REMOVING CareInformationAccess");
                return $.Deferred().resolve(wrapper);
            });
        },

        doChangeSU: function (suid) {
            "use strict"
            // Returns an object with {status = "OK|Error", errors, selectedSU}
            var deferred = $.Deferred();
            var data = { selectedSU: suid };

            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("POST", _baseURL + "/MCM/ProviderComponent2/DoChangeSU", null, data, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {

                    var info = {};
                    try {
                        info = JSON.parse(content);
                    } catch (ex) { }

                    if (info && info.authenticated === true && info.access) {
                        setAccessInfoToStorage(info.access);
                    } else {
                        setAccessInfoToStorage(null);
                    }

                    return $.Deferred().resolve(info);
                });
        },

        loadChangeSU: function (containerId) {
            "use strict"

            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/ChangeSU", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadCareSummary: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/CareSummary", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadDailyPlan: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/DailyPlan", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadDailyCare: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/DailyCare", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadCareNotesStory: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/CareNotesStory", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                    function (containerId) {
                        _ajaxOnError(containerId);
                        return $.Deferred().resolve(wrapper);
                    });
        },

        loadCareNotesChart: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/CareNotesChart", containerId, { adls: getAdlPref()}, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);

                    // Hook up to ADL change
                    $("#" + containerId).find("#adl-header").click(function () {
                        $("#" + containerId).find("#adl-selector").toggle();
                    })
                    $("#" + containerId).find("#adl-selector span.adl-option").click(function () {
                        var $o = $(this);
                        if ($o.hasClass("selected"))
                            $o.removeClass("selected");
                        else
                            $o.addClass("selected");
                    })
                    $("#" + containerId).find("#adl-selector span.pcs-button").click(function () {
                        var selected = [];

                        $("#" + containerId).find("#adl-selector span.adl-option.selected").each(function (i, o) {
                            selected.push($(o).data("adlid"));
                        });
                        saveAdlPref(selected);
                        wrapper.loadCareNotesChart(containerId);
                    })

                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });

            function getAdlPref() {
                var o = localStorage.getItem("adlfilters");
                if (!o || o.length === 0)
                    return [-999];
                return o.split(',');
            }
            function saveAdlPref(pref) {
                if (!pref || pref.length === 0) localStorage.removeItem("adlfilters");
                else localStorage.setItem("adlfilters", pref.join(','));
            }
        },

        loadActivitiesChart: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/ActivitiesChart", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadHygieneChart: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/HygieneChart", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadFluidChart: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/FluidChart", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadCareHoursPerAdl: function (containerId) {
            // resolves to lib
            if (typeof (kendo) === "undefined") {
                return $LAB
                    .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                    .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.dataviz.min.js", type: "text/javascript" })
                    .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                    .wait(function () {
                        return _load();

                    });

            }
            else {
                return _load();
            }

            function _load() {
                return (function () {
                    var deferred = $.Deferred();
                    _ajax("GET", _baseURL + "/MCM/ProviderComponent2/CareHoursPerAdl", containerId, null, deferred);
                    return deferred.promise();
                })()
                    .then(function (containerId, content) {
                        _ajaxOnSuccess(containerId, content);
                        return $.Deferred().resolve(wrapper);
                    },
                    function (containerId) {
                        _ajaxOnError(containerId);
                        return $.Deferred().resolve(wrapper);
                    });
            }
        },

        loadCareNotesPerDay: function (containerId) {
            // resolves to lib
            if (typeof (kendo) === "undefined") {
                return $LAB
                    .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                    .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.dataviz.min.js", type: "text/javascript" })
                    .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                    .wait(function () {
                        return _load();
                    });

            }
            else {
                return _load();
            }

            function _load() {
                return (function () {
                    var deferred = $.Deferred();
                    _ajax("GET", _baseURL + "/MCM/ProviderComponent2/CareNotesPerDay", containerId, null, deferred);
                    return deferred.promise();
                })()
                    .then(function (containerId, content) {
                        _ajaxOnSuccess(containerId, content);
                        return $.Deferred().resolve(wrapper);
                    },
                    function (containerId) {
                        _ajaxOnError(containerId);
                        return $.Deferred().resolve(wrapper);
                    });
            }
        },

        loadPortrait: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/Portrait", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadHappiness: function (containerId) {
            // resolves to lib
            return (function () {
                var deferred = $.Deferred();
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/Happiness", containerId, null, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    _ajaxOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId) {
                    _ajaxOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },

        loadCompleteCarePlanDocument: function (containerId) {
            "use strict"
            // Opens a new tab
            var ticket = getTicketFromStorage() || "noticket";
            var url = _baseURL + '/MCM/ProviderComponent2/CompleteCarePlanDocument/' + _providerId + '?ticket=' + ticket;
            window.open(url, '_blank');
        },

        loadMessenger: function (containerId) {
            "use strict"
            // resolves to lib
            $LAB.setOptions({ AllowDuplicates: false })
                .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe-ui-default.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PhotoSwipe/GalleryLoader.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PicEdit/js/picedit.js", type: "text/javascript" })
                .wait(function () {
                    (function () {
                        var deferred = $.Deferred();
                        _ajax("GET", _baseURL + "/MCM/ProviderComponent2/Messenger", containerId, null, deferred);
                        return deferred.promise();
                    })()
                        .then(function (containerId, content) {
                            _ajaxOnSuccess(containerId, content);

                            // Set messages as Read in the storage
                            var access = getAccessInfoFromStorage();
                            if (access) {
                                access.UnreadMessages = false;
                                setAccessInfoToStorage(access);
                            }

                            return $.Deferred().resolve(wrapper);
                        },
                        function (containerId) {
                            _ajaxOnError(containerId);
                            return $.Deferred().resolve(wrapper);
                        });
                });
        },

        loadGallery: function (containerId) {
            "use strict";
            // resolves to lib
            $LAB.setOptions({ AllowDuplicates: false })
                .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.web.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "Kendo.2017.3.1018/kendo.aspnetmvc.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PhotoSwipe/4.0.7/photoswipe-ui-default.min.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PhotoSwipe/GalleryLoader.js", type: "text/javascript" })
                .script({ src: _contentURL + "/MCM/scripts/" + "PicEdit/js/picedit.js", type: "text/javascript" })
                .wait(function () {

                    (function () {
                        var deferred = $.Deferred();
                        _ajax("GET", _baseURL + "/MCM/ProviderComponent2/Gallery", containerId, null, deferred);
                        return deferred.promise();
                    })()
                        .then(function (containerId, content) {
                            _ajaxOnSuccess(containerId, content);
                            return $.Deferred().resolve(wrapper);
                        },
                        function (containerId) {
                            _ajaxOnError(containerId);
                            return $.Deferred().resolve(wrapper);
                        });
                });
        },

        loadResetPassword: function (containerId) {
            "use strict";
            // resolves to lib
            var token = "";
            var query = window.location.search.substring(1);
            var parts = query.split("&");
            for (var i = 0; i < parts.length; i++) {
                if (parts[i].indexOf("token=") !== 0) continue;
                token = parts[i].split("=")[1];
                break;
            }
            if (token == "") {
                loadResetPasswordOnError(containerId);
                return $.Deferred().resolve(wrapper);
            }

            // resolves to lib
            return (function () {
                var deferred = $.Deferred();

                var data = { token: token, returnurl: _providerURL };
                _ajax("GET", _baseURL + "/MCM/ProviderComponent2/ResetPassword", containerId, data, deferred);
                return deferred.promise();
            })()
                .then(function (containerId, content) {
                    loadResetPasswordOnSuccess(containerId, content);
                    return $.Deferred().resolve(wrapper);
                },
                function (containerId, error) {
                    loadResetPasswordOnError(containerId);
                    return $.Deferred().resolve(wrapper);
                });
        },
    }

    return {
        getInstance: function () {
            if (_providerId === undefined || _providerId.length !== 36)
                throw 'PcsComponents has not been initialised with the provider ID';

            if (initialised === false) {
                // Load kendo libraries and css - method recommended by Google/PageSpeed
                initialised = true;

                $.ajax({
                    url: _contentURL + "/MCM/scripts/LAB.min.js",
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
        init: function (obj) {

            if (!obj.providerId)
                throw "Provider id must be specified during initialisation";
            _providerId = obj.providerId;

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
