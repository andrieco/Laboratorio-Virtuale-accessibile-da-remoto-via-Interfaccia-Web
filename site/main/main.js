
$(document).ready(function () {

	$('.ui.dropdown').dropdown();

	$('.clickable.ui.bordered.segment:not(.unavailable)').click(function () {
		let ID = $(this).attr("id");
		if(ID !== "FAQ")
			window.location.href = "/connect#" + ID;
	});

	$('#Logout').click(function () {
		fetch("/user/logout", {
			method: "POST"
		})
			.then(response => {
				if(response.ok)
					window.location.href = "/login";
				else
					console.log(response);
			})
			.catch(err => console.log(err))
	});

	$('#FAQ').click(function () {
		window.location.href = "/faq";
	});
});