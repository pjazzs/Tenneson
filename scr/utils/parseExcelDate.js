const XLSX = require("xlsx");


const parseExcelDate = (value) => {


  if (!value) {
    return null;
  }



  // Handle Excel serial dates
  if (typeof value === "number") {

    const excelDate =
      XLSX.SSF.parse_date_code(value);


    if (!excelDate) {
      return null;
    }


    return new Date(
      excelDate.y,
      excelDate.m - 1,
      excelDate.d
    );

  }




  // Handle string dates

  if (typeof value === "string") {


    value = value.trim();



    // Handle MM/DD/YYYY

    const slashDate =
      value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);



    if (slashDate) {


      const month = Number(slashDate[1]);

      const day = Number(slashDate[2]);

      const year = Number(slashDate[3]);



      return new Date(
        year,
        month - 1,
        day
      );

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




  return null;

};



module.exports = parseExcelDate;