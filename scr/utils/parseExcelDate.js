if (typeof value === "string") {

  value = value.trim();


  // Handle DD/MM/YYYY and MM/DD/YYYY

  const slashDate =
    value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);


  if (slashDate) {


    const first = Number(slashDate[1]);

    const second = Number(slashDate[2]);

    const year = Number(slashDate[3]);



    let day;

    let month;



    // If first number is greater than 12,
    // it must be DD/MM/YYYY

    if (first > 12) {

      day = first;

      month = second;

    } else {

      month = first;

      day = second;

    }



    const date = new Date(
      year,
      month - 1,
      day
    );



    // verify invalid dates like 31/02/2013

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {

      return null;

    }



    return date;

  }



  // Handle YYYY-MM-DD

  const dashDate =
    value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);



  if (dashDate) {


    const year = Number(dashDate[1]);

    const month = Number(dashDate[2]);

    const day = Number(dashDate[3]);



    return new Date(
      year,
      month - 1,
      day
    );

  }

}