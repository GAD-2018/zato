
// A base class for representing a scheduler's job.
var Job = Class.create({
    initialize: function(record) {
        this.name = null;
        this.is_active = null;
        this.job_type = null;
        this.definition_text = null;

    }
});

Job.prototype.boolean_html = function(attr) {
    return attr ? 'Yes': 'No';
}

Job.prototype.service_text = function(attr) {
    return String.format('<a href="/zato/service/?service={0}">{1}</a>', this.service, this.service);
}

// A nicer toString.
Job.prototype.toString = function() {
    return '<Job\
 name=[' + this.name + ']\
 is_active=[' + this.is_active + ']\
 job_type=[' + this.job_type + ']\
 definition_text=[' + this.definition_text + ']\
>';
};

// Dumps properties in a form suitable for creating a new data table row.
Job.prototype.to_record = function() {
    var record = new Array();
	record['selection'] = '<input type="checkbox" />';
    record['name'] = this.name;
    record['is_active'] = this.boolean_html(this.is_active);
	record['job_type'] = this.job_type;
    record['job_type_friendly'] = friendly_names.get(this.job_type);
    record['definition_text'] = this.definition_text;
	record['service_text'] = this.service_text();
    record['edit'] = String.format("<a href=\"javascript:edit('{0}', {1})\">Edit</a>", this.job_type, this.id);
    record['execute'] = String.format("<a href='javascript:execute({0})'>Execute</a>", this.id);
    record['delete'] = String.format("<a href='javascript:delete_({0})'>Delete</a>", this.id);

    return record;
};

Job.prototype.add_row = function(object, data_dt) {

    var add_at_idx = 0;
    data_dt.addRow(object.to_record(), add_at_idx);
    
    var added_record = data_dt.getRecord(add_at_idx);
	
    added_record.setData('id', object.id);
    added_record.setData('name', object.name);
    added_record.setData('is_active', object.is_active);
	added_record.setData('start_date', object.start_date);
    added_record.setData('job_type', object.job_type);
	added_record.setData('job_type_friendly', friendly_names.get(object.job_type));
    added_record.setData('service', object.service);
	added_record.setData('service_text', object.service_text);
    added_record.setData('definition_text', object.definition_text);
	added_record.setData('extra', object.extra);
	
	return added_record;

}

// Specialized subclasses.
var OneTimeJob = Class.create(Job, {
    initialize: function($super, record) {
        $super(record);
        this.job_type = 'one_time';
    },
    set_properties: function($super, record) {
        $super(record);
    },
});

var IntervalBasedJob = Class.create(Job, {
    initialize: function($super, record) {
        $super(record);
        this.job_type = 'interval_based';
    },
    set_properties: function($super, record) {
        $super(record);
    },
});

var CronStyleJob = Class.create(Job, {
    initialize: function($super, record) {
        $super(record);
        this.job_type = 'cron_style';
    },
    set_properties: function($super, record) {
        $super(record);
    },
});


// /////////////////////////////////////////////////////////////////////////////

function dt_picker(input_id) {

    var year, month, day, hour, minute;
    var start_date = $(input_id).value;

    // It's okay if there's no value at all, it could be a 'create' action
    // currently being handled.
    if(start_date == '') {
        now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
        day = now.getDay();
        hour = now.getHours();
        minute = now.getMinutes();
        second = now.getSeconds();
    }
    else {
        var start_date_splitted = start_date.split(" ");
        if(start_date_splitted.length != 2) {
            return; // What can we do..
        }

        var date_splitted = start_date_splitted[0].split("-");
        if(date_splitted.length != 3) {
            return; // Same as above..
        }

        year = parseInt(date_splitted[0]);
        month = parseInt(date_splitted[1]) - 1;
        day = parseInt(date_splitted[2]);

        var time_splitted = start_date_splitted[1].split(":");
        if(time_splitted.length != 3) {
            return; // Same as above..
        }

        hour = parseInt(time_splitted[0]);
        minute = parseInt(time_splitted[1]);
        second = parseInt(time_splitted[2]);

        var start_date_splitted = start_date.split(" ");
    }

    var picker_options = {
        time:true,
        year_range:10,
        minute_interval:1,
        initial_year: year,
        initial_month: month,
        initial_day: day,
        initial_hour: hour,
        initial_minute: minute,
        initial_second: second,
    }
    var calendar_date_select = new CalendarDateSelect($(input_id), picker_options);
}

// /////////////////////////////////////////////////////////////////////////////

function validate_interval_based_fields(action) {

	var seen_anything = false;
	var suffixes = ['weeks', 'days', 'hours', 'minutes', 'seconds'];
	
	suffixes.each(function(name) {
		var value = $('id_' + action + '-interval_based-' + name).value;
		if(value) {
			seen_anything = true;
			throw $break;
		}
	});
	
	if(!seen_anything) {
		alert('At least one of the weeks, days, hours, minutes or seconds must be provided');
		return false;
	}
	else {
		return true;
	}
}

// /////////////////////////////////////////////////////////////////////////////
// create
// /////////////////////////////////////////////////////////////////////////////

function create(job_type) {
    // Show the create dialog.
	window[String.format('create_{0}_dialog', job_type)].show();
}

// /////////////////////////////////////////////////////////////////////////////

function setup_create_dialog_one_time() {
    var create_one_time_validation = new Validation('create-form-one_time');

    var on_submit = function() {
        if(create_one_time_validation.validate()) {
            // Submit the form if no errors have been found on the UI side.
            this.submit();
        }
    };

    var on_cancel = function() {
        this.cancel();
        create_one_time_dialog.hide();
        $('create-form-one_time').reset();
        create_one_time_validation.reset();
    };

    var on_success = function(o) {

        var json = YAHOO.lang.JSON.parse(o.responseText);
        var object = new OneTimeJob();
		
        object.id = json.id;        
        object.name = $('id_create-one_time-name').value;
        object.is_active = $F('id_create-one_time-is_active') == 'on';
        object.service = $('id_create-one_time-service').value;
        object.definition_text = json.definition_text;
		object.start_date = $('id_create-one_time-start_date').value;
		object.extra = $('id_create-one_time-extra').value;
		
        object.add_row(object, data_dt);
        create_one_time_dialog.hide();
        $('create-form-one_time').reset();
        create_one_time_validation.reset();

        update_user_message(true, 'Successfully created a new one_time job [' + object.name + '].');
    };

    var on_failure = function(o) {
        create_one_time_dialog.hide();
        $('create-form-one_time').reset();
        create_one_time_validation.reset();
        update_user_message(false, o.responseText);
    };

    // Instantiate the dialog if necessary.
    if(typeof create_one_time_dialog == 'undefined') {
        create_one_time_dialog = new YAHOO.widget.Dialog('create-one_time',
                                { width: '50em',
                                  fixedcenter: true,
                                  visible: false,
                                  draggable: true,
                                  postmethod: 'async',
                                  hideaftersubmit: false,
                                  constraintoviewport: true,
                                  buttons: [{text:'Submit', handler:on_submit},
                                            {text:'Cancel', handler:on_cancel, isDefault:true}]
                                });

        create_one_time_dialog.callback.success = on_success;
        create_one_time_dialog.callback.failure = on_failure;

        create_one_time_dialog.render();
    }
}

// /////////////////////////////////////////////////////////////////////////////

function setup_create_dialog_interval_based() {
    var create_interval_based_validation = new Validation('create-form-interval_based');

    var on_submit = function() {
        if(create_interval_based_validation.validate() 
			&& validate_interval_based_fields('create')) {
				this.submit();
		}
    };

    var on_cancel = function() {
        this.cancel();
        create_interval_based_dialog.hide();
        $('create-form-interval_based').reset();
        create_interval_based_validation.reset();
    };

    var on_success = function(o) {

        var json = YAHOO.lang.JSON.parse(o.responseText);
        var object = new IntervalBasedJob();
		
        object.id = json.id;        
        object.name = $('id_create-interval_based-name').value;
        object.is_active = $F('id_create-interval_based-is_active') == 'on';
        object.service = $('id_create-interval_based-service').value;
        object.definition_text = json.definition_text;
		object.start_date = $('id_create-interval_based-start_date').value;
		object.extra = $('id_create-interval_based-extra').value;
		object.weeks = $('id_create-interval_based-weeks').value;
		object.days = $('id_create-interval_based-days').value;
		object.hours = $('id_create-interval_based-hours').value;
		object.minutes = $('id_create-interval_based-minutes').value;
		object.seconds = $('id_create-interval_based-seconds').value;
		object.repeats = $('id_create-interval_based-repeats').value;
		
		var record = object.add_row(object, data_dt);
		
		record.setData('weeks', object.weeks);
		record.setData('days', object.days);
		record.setData('hours', object.hours);
		record.setData('minutes', object.minutes);
		record.setData('seconds', object.seconds);
		record.setData('repeats', object.repeats);
		
        create_interval_based_dialog.hide();
        $('create-form-interval_based').reset();
        create_interval_based_validation.reset();

        update_user_message(true, 'Successfully created a new interval_based job [' + object.name + '].');
    };

    var on_failure = function(o) {
        create_interval_based_dialog.hide();
        $('create-form-interval_based').reset();
        create_interval_based_validation.reset();
        update_user_message(false, o.responseText);
    };

    // Instantiate the dialog if necessary.
    if(typeof create_interval_based_dialog == 'undefined') {
        create_interval_based_dialog = new YAHOO.widget.Dialog('create-interval_based',
                                { width: '50em',
                                  fixedcenter: true,
                                  visible: false,
                                  draggable: true,
                                  postmethod: 'async',
                                  hideaftersubmit: false,
                                  constraintoviewport: true,
                                  buttons: [{text:'Submit', handler:on_submit},
                                            {text:'Cancel', handler:on_cancel, isDefault:true}]
                                });

        create_interval_based_dialog.callback.success = on_success;
        create_interval_based_dialog.callback.failure = on_failure;

        create_interval_based_dialog.render();
    }
}

// /////////////////////////////////////////////////////////////////////////////

function setup_create_dialog_cron_style() {
    var create_cron_style_validation = new Validation('create-form-cron_style');

    var on_submit = function() {
        if(create_cron_style_validation.validate()) {
            // Submit the form if no errors have been found on the UI side.
            this.submit();
        }
    };

    var on_cancel = function() {
        this.cancel();
        create_cron_style_dialog.hide();
        $('create-form-cron_style').reset();
        create_cron_style_validation.reset();
    };

    var on_success = function(o) {

        var json = YAHOO.lang.JSON.parse(o.responseText);
        var object = new CronStyleJob();
		
        object.id = json.id;        
        object.name = $('id_create-cron_style-name').value;
        object.is_active = $F('id_create-cron_style-is_active') == 'on';
        object.service = $('id_create-cron_style-service').value;
        object.definition_text = json.definition_text;
		object.start_date = $('id_create-cron_style-start_date').value;
		object.cron_definition = json.cron_definition;
		object.extra = $('id_create-cron_style-extra').value;
		
        var record = object.add_row(object, data_dt);
		record.setData('cron_definition', object.cron_definition);
		
        create_cron_style_dialog.hide();
        $('create-form-cron_style').reset();
        create_cron_style_validation.reset();

        update_user_message(true, 'Successfully created a new cron_style job [' + object.name + '].');
    };

    var on_failure = function(o) {
        create_cron_style_dialog.hide();
        $('create-form-cron_style').reset();
        create_cron_style_validation.reset();
        update_user_message(false, o.responseText);
    };

    // Instantiate the dialog if necessary.
    if(typeof create_cron_style_dialog == 'undefined') {
        create_cron_style_dialog = new YAHOO.widget.Dialog('create-cron_style',
                                { width: '50em',
                                  fixedcenter: true,
                                  visible: false,
                                  draggable: true,
                                  postmethod: 'async',
                                  hideaftersubmit: false,
                                  constraintoviewport: true,
                                  buttons: [{text:'Submit', handler:on_submit},
                                            {text:'Cancel', handler:on_cancel, isDefault:true}]
                                });

        create_cron_style_dialog.callback.success = on_success;
        create_cron_style_dialog.callback.failure = on_failure;

        create_cron_style_dialog.render();
    }
}

// /////////////////////////////////////////////////////////////////////////////
// edit
// /////////////////////////////////////////////////////////////////////////////

function edit(job_type, job_id) {
	
	var prefix = String.format('id_edit-{0}-', job_type);
	var extra_fields = [];
	
    if(job_type == 'interval_based') {
		extra_fields = ['weeks', 'days', 'hours', 'minutes', 'seconds', 'repeats'];
	}
	else if(job_type == 'cron_style') {
		extra_fields = ['cron_definition'];
	};
	
	var records = data_dt.getRecordSet().getRecords();
	for (x=0; x < records.length; x++) {
		var record = records[x];
		var id = record.getData('id');
		if(id && id == job_id) {
		
			// TODO: This == 'Yes' thing isn't exactly anything like it should be done.
			var is_active = record.getData('is_active') == 'Yes' ? 'on' : ''

			$(prefix + 'id').value = record.getData('id');
			$(prefix + 'name').value = record.getData('name');
			$(prefix + 'start_date').value = record.getData('start_date');
			$(prefix + 'is_active').setValue(is_active);
			$(prefix + 'service').setValue(record.getData('service'));
			$(prefix + 'extra').setValue(record.getData('extra'));
			
			extra_fields.each(function(name) {
				$(prefix + name).value = record.getData(name);
			});
			
			break;
		}
	}
	
	$('edit-' + job_type).show();
	window['edit_' + job_type + '_dialog'].show();	
	
}

// /////////////////////////////////////////////////////////////////////////////

function setup_edit_dialog_one_time() {
    var edit_one_time_validation = new Validation('edit-form-one_time');

    var on_submit = function() {
        if(edit_one_time_validation.validate()) {
            // Submit the form if no errors have been found on the UI side.
            this.submit();
        }
    };

    var on_cancel = function() {
        this.cancel();
        edit_one_time_dialog.hide();
        $('edit-form-one_time').reset();
        edit_one_time_validation.reset();
    };

    var on_success = function(o) {

        var json = YAHOO.lang.JSON.parse(o.responseText);
        var object = new OneTimeJob();

        object.id = $('id_edit-one_time-id').value;
        object.name = $('id_edit-one_time-name').value;
        object.is_active = $F('id_edit-one_time-is_active') == 'on';
        object.service = $('id_edit-one_time-service').value;
		object.extra = $('id_edit-one_time-extra').value;
        object.definition_text = json.definition_text;
		
		edit_one_time_dialog.hide();
		$('edit-form-one_time').reset();
		edit_one_time_validation.reset();

		var records = data_dt.getRecordSet().getRecords();
		for (x=0; x < records.length; x++) {
			var record = records[x];
			var id = record.getData('id');
			if(id && id == object.id) {

				record.setData('name', object.name);
				record.setData('is_active', object.is_active ? 'Yes': 'No');
				record.setData('service_text', object.service_text());
				record.setData('extra', object.extra);
				record.setData('definition_text', object.definition_text);
				
				data_dt.render();
			}
		}
			
        update_user_message(true, 'Successfully edited the one-time job [' + object.name + '].');
    };

    var on_failure = function(o) {
        edit_one_time_dialog.hide();
        $('edit-form-one_time').reset();
        edit_one_time_validation.reset();
        update_user_message(false, o.responseText);
    };

    // Instantiate the dialog if necessary.
    if(typeof edit_one_time_dialog == 'undefined') {
        edit_one_time_dialog = new YAHOO.widget.Dialog('edit-one_time',
                                { width: '50em',
                                  fixedcenter: true,
                                  visible: false,
                                  draggable: true,
                                  postmethod: 'async',
                                  hideaftersubmit: false,
                                  constraintoviewport: true,
                                  buttons: [{text:'Submit', handler:on_submit},
                                            {text:'Cancel', handler:on_cancel, isDefault:true}]
                                });

        edit_one_time_dialog.callback.success = on_success;
        edit_one_time_dialog.callback.failure = on_failure;

        edit_one_time_dialog.render();
    }
}

// /////////////////////////////////////////////////////////////////////////////

function setup_edit_dialog_interval_based() {
    var edit_interval_based_validation = new Validation('edit-form-interval_based');

    var on_submit = function() {
        if(edit_interval_based_validation.validate() 
			&& validate_interval_based_fields('edit')) {
				this.submit();
		}
    };

    var on_cancel = function() {
        this.cancel();
        edit_interval_based_dialog.hide();
        $('edit-form-interval_based').reset();
        edit_interval_based_validation.reset();
    };

    var on_success = function(o) {

        var json = YAHOO.lang.JSON.parse(o.responseText);
        var object = new IntervalBasedJob();

        object.id = $('id_edit-interval_based-id').value;
        object.name = $('id_edit-interval_based-name').value;
        object.is_active = $F('id_edit-interval_based-is_active') == 'on';
        object.service = $('id_edit-interval_based-service').value;
		object.extra = $('id_edit-interval_based-extra').value;
        object.definition_text = json.definition_text;
		object.weeks = $('id_edit-interval_based-weeks').value;
		object.days = $('id_edit-interval_based-days').value;
		object.hours = $('id_edit-interval_based-hours').value;
		object.minutes = $('id_edit-interval_based-minutes').value;
		object.seconds = $('id_edit-interval_based-seconds').value;
		object.repeats = $('id_edit-interval_based-repeats').value;
		
		edit_interval_based_dialog.hide();
		$('edit-form-interval_based').reset();
		edit_interval_based_validation.reset();

		var records = data_dt.getRecordSet().getRecords();
		for (x=0; x < records.length; x++) {
			var record = records[x];
			var id = record.getData('id');
			if(id && id == object.id) {

				record.setData('name', object.name);
				record.setData('is_active', object.is_active ? 'Yes': 'No');
				record.setData('service_text', object.service_text());
				record.setData('extra', object.extra);
				record.setData('definition_text', object.definition_text);
				record.setData('weeks', object.weeks);
				record.setData('days', object.days);
				record.setData('hours', object.hours);
				record.setData('minutes', object.minutes);
				record.setData('seconds', object.seconds);
				record.setData('repeats', object.repeats);
				
				data_dt.render();
			}
		}
			
        update_user_message(true, 'Successfully edited the interval-based job [' + object.name + '].');
    };

    var on_failure = function(o) {
        edit_interval_based_dialog.hide();
        $('edit-form-interval_based').reset();
        edit_interval_based_validation.reset();
        update_user_message(false, o.responseText);
    };

    // Instantiate the dialog if necessary.
    if(typeof edit_interval_based_dialog == 'undefined') {
        edit_interval_based_dialog = new YAHOO.widget.Dialog('edit-interval_based',
                                { width: '50em',
                                  fixedcenter: true,
                                  visible: false,
                                  draggable: true,
                                  postmethod: 'async',
                                  hideaftersubmit: false,
                                  constraintoviewport: true,
                                  buttons: [{text:'Submit', handler:on_submit},
                                            {text:'Cancel', handler:on_cancel, isDefault:true}]
                                });

        edit_interval_based_dialog.callback.success = on_success;
        edit_interval_based_dialog.callback.failure = on_failure;

        edit_interval_based_dialog.render();
    }
}

// /////////////////////////////////////////////////////////////////////////////

function setup_edit_dialog_cron_style() {
    var edit_cron_style_validation = new Validation('edit-form-cron_style');

    var on_submit = function() {
        if(edit_cron_style_validation.validate()) {
            // Submit the form if no errors have been found on the UI side.
            this.submit();
        }
    };

    var on_cancel = function() {
        this.cancel();
        edit_cron_style_dialog.hide();
        $('edit-form-cron_style').reset();
        edit_cron_style_validation.reset();
    };

    var on_success = function(o) {

        var json = YAHOO.lang.JSON.parse(o.responseText);
        var object = new CronStyleJob();

        object.id = $('id_edit-cron_style-id').value;
        object.name = $('id_edit-cron_style-name').value;
        object.is_active = $F('id_edit-cron_style-is_active') == 'on';
        object.service = $('id_edit-cron_style-service').value;
		object.extra = $('id_edit-cron_style-extra').value;
		object.cron_definition = json.cron_definition;
        object.definition_text = json.definition_text;
		
		edit_cron_style_dialog.hide();
		$('edit-form-cron_style').reset();
		edit_cron_style_validation.reset();

		var records = data_dt.getRecordSet().getRecords();
		for (x=0; x < records.length; x++) {
			var record = records[x];
			var id = record.getData('id');
			if(id && id == object.id) {

				record.setData('name', object.name);
				record.setData('is_active', object.is_active ? 'Yes': 'No');
				record.setData('service_text', object.service_text());
				record.setData('extra', object.extra);
				record.setData('definition_text', object.definition_text);
				record.setData('cron_definition', object.cron_definition);
				
				data_dt.render();
			}
		}
			
        update_user_message(true, 'Successfully edited the cron-style job [' + object.name + '].');
    };

    var on_failure = function(o) {
        edit_cron_style_dialog.hide();
        $('edit-form-cron_style').reset();
        edit_cron_style_validation.reset();
        update_user_message(false, o.responseText);
    };

    // Instantiate the dialog if necessary.
    if(typeof edit_cron_style_dialog == 'undefined') {
        edit_cron_style_dialog = new YAHOO.widget.Dialog('edit-cron_style',
                                { width: '50em',
                                  fixedcenter: true,
                                  visible: false,
                                  draggable: true,
                                  postmethod: 'async',
                                  hideaftersubmit: false,
                                  constraintoviewport: true,
                                  buttons: [{text:'Submit', handler:on_submit},
                                            {text:'Cancel', handler:on_cancel, isDefault:true}]
                                });

        edit_cron_style_dialog.callback.success = on_success;
        edit_cron_style_dialog.callback.failure = on_failure;

        edit_cron_style_dialog.render();
    }
}

// /////////////////////////////////////////////////////////////////////////////
// delete
// /////////////////////////////////////////////////////////////////////////////

function setup_delete_dialog() {

    var on_success = function(o) {
        msg = 'Successfully deleted the job [' + current_delete_name + ']';

        // Delete the row..
        
        var records = data_dt.getRecordSet().getRecords();
        for (x=0; x < records.length; x++) {
            var record = records[x];
            var id_record = record.getData('id');
            if(id_record && current_delete_id == id_record) {
                data_dt.deleteRow(x);
                break;
            }
        }

        // .. and confirm everything went fine.
        update_user_message(true, msg);
    };

    var on_failure = function(o) {
        update_user_message(false, o.responseText);
    }

    var callback = {
        success: on_success,
        failure: on_failure,
    };

    var on_yes = function() {

        var url = String.format('./delete/{0}/cluster/{1}/', current_delete_id, $('cluster_id').value);

        YAHOO.util.Connect.initHeader('X-CSRFToken', YAHOO.util.Cookie.get('csrftoken'));
        var transaction = YAHOO.util.Connect.asyncRequest('POST', url, callback);

        this.hide();
    };

    var on_no = function() {
        this.hide();
    };

    delete_dialog = new YAHOO.widget.SimpleDialog('delete_dialog', {
        width: '36em',
        effect:{
            effect: YAHOO.widget.ContainerEffect.FADE,
            duration: 0.10
        },
        fixedcenter: true,
        modal: false,
        visible: false,
        draggable: true
    });

    delete_dialog.setHeader('Are you sure?');
    delete_dialog.cfg.setProperty('icon', YAHOO.widget.SimpleDialog.ICON_WARN);

    var delete_buttons = [
        {text: 'Yes', handler: on_yes},
        {text:'Cancel', handler: on_no, isDefault:true}
    ];

    delete_dialog.cfg.queueProperty('buttons', delete_buttons);
    delete_dialog.render(document.body);

};

// /////////////////////////////////////////////////////////////////////////////

function delete_(id) {

    current_delete_id = id;
    
    var records = data_dt.getRecordSet().getRecords();
    for (x=0; x < records.length; x++) {
        var record = records[x];
        var id_record = record.getData('id');
        if(id_record && id == id_record) {
            current_delete_name = record.getData('name').strip();
            break;
        }
    }

    delete_dialog.setBody(String.format('Are you sure you want to delete the job [{0}]?', current_delete_name));
    delete_dialog.show();
    
}

// /////////////////////////////////////////////////////////////////////////////

function execute(id) {

    var on_success = function(o) {
        update_user_message(true, 'Request submitted, check the logs for details');
    };

    var on_failure = function(o) {
        update_user_message(false, o.responseText);
    }

    var callback = {
        success: on_success,
        failure: on_failure,
    };

	var url = String.format('./execute/{0}/cluster/{1}/', id, $('cluster_id').value);

	YAHOO.util.Connect.initHeader('X-CSRFToken', YAHOO.util.Cookie.get('csrftoken'));
	var transaction = YAHOO.util.Connect.asyncRequest('POST', url, callback);
}

// /////////////////////////////////////////////////////////////////////////////

YAHOO.util.Event.onDOMReady(function() {

    Date.prototype.getPaddedHours = function() {
        var hour = this.getHours();
        if (hour < 10)
            hour = "0" + hour;
        return hour;
    }

    // Customize formatting of hours by adding a leading '0' if it's < 10
    Date.prototype.toFormattedString = function(include_time) {
        var hour;
        var str = this.getFullYear() + "-" + Date.padded2(this.getMonth() + 1) + "-" +Date.padded2(this.getDate());
        if (include_time) {
            hour = this.getHours();
            str += " " + this.getPaddedHours() + ":" + this.getPaddedMinutes() + ":00";
        }
        return str;
    };
	
	['one_time', 'interval_based', 'cron_style'].each(function(job_type) {
		window[String.format('setup_create_dialog_{0}', job_type)]();
		window[String.format('setup_edit_dialog_{0}', job_type)]();
	});
    setup_delete_dialog();
});
