import { useState } from "react";

import {
  FaUpload,
  FaDownload,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";

import * as XLSX from "xlsx";

import api from "../../api/axios";



function BulkImportStudents({
  onImportSuccess
}) {


  const [showModal, setShowModal] = useState(false);


  const [selectedFile, setSelectedFile] = useState(null);


  const [importing, setImporting] = useState(false);


  const [importResult, setImportResult] = useState(null);





  const downloadTemplate = () => {


    const template = [

      {

        firstName: "",

        lastName: "",

        otherName: "",

        gender: "",

        dateOfBirth: "MM/DD/YYYY",

        currentClass: "",

        session: "",

        parentName: "",

        parentPhone: "",

      }

    ];



    const worksheet = XLSX.utils.json_to_sheet(
      template
    );



    const workbook = XLSX.utils.book_new();



    XLSX.utils.book_append_sheet(

      workbook,

      worksheet,

      "Students"

    );



    XLSX.writeFile(

      workbook,

      "student_import_template.xlsx"

    );


  };






  const handleImport = async () => {


    if(!selectedFile){

      alert(
        "Please select an Excel file"
      );

      return;

    }





    try {


      setImporting(true);



      const formData = new FormData();



      formData.append(

        "file",

        selectedFile

      );





      const response = await api.post(

        "/students/import",

        formData

      );





      setImportResult(

        response.data

      );





      setSelectedFile(null);



      if(onImportSuccess){

        onImportSuccess();

      }




    } catch(error){


      console.log(

        "Bulk import error:",

        error.response?.data || error.message

      );



    } finally {


      setImporting(false);


    }


  };

    return (

    <>

      <button


        onClick={() => {

          setShowModal(true);

          setImportResult(null);

        }}


        className="
          flex
          items-center
          gap-2
          bg-blue-600
          hover:bg-blue-700
          px-5
          py-3
          rounded-xl
          transition
          shadow-lg
        "


      >

        <FaUpload/>


        Import Excel


      </button>






      {
        showModal && (


          <div

            className="
              fixed
              inset-0
              bg-black/60
              flex
              items-center
              justify-center
              z-50
              p-4
            "

          >




            <div

              className="
                bg-slate-900
                border
                border-white/10
                rounded-2xl
                p-6
                w-full
                max-w-lg
                text-white
              "

            >





              <div

                className="
                  flex
                  justify-between
                  items-center
                  mb-6
                "

              >



                <div>


                  <h2 className="text-xl font-bold">

                    Bulk Import Students

                  </h2>



                  <p className="text-gray-400 text-sm mt-1">

                    Upload student records using Excel.

                  </p>


                </div>






                <button


                  onClick={() =>

                    setShowModal(false)

                  }


                  className="
                    text-gray-400
                    hover:text-white
                  "


                >


                  <FaTimes/>


                </button>




              </div>








              <button


                onClick={downloadTemplate}


                className="
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-green-600
                  hover:bg-green-700
                  py-3
                  rounded-xl
                  mb-5
                "


              >


                <FaDownload/>


                Download Excel Template


              </button>








              <div

                className="
                  border
                  border-dashed
                  border-white/20
                  rounded-xl
                  p-5
                  text-center
                "

              >



                <input


                  type="file"


                  accept=".xlsx,.xls"


                  onChange={(e) =>

                    setSelectedFile(
                      e.target.files[0]
                    )

                  }


                  className="
                    w-full
                    text-sm
                    text-gray-300
                  "


                />





                {

                  selectedFile && (


                    <p

                      className="
                        mt-3
                        text-sm
                        text-green-400
                      "

                    >


                      Selected:

                      {" "}

                      {selectedFile.name}


                    </p>


                  )

                }



              </div>









              <button


                onClick={handleImport}


                disabled={importing}


                className="
                  mt-5
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-blue-600
                  hover:bg-blue-700
                  disabled:opacity-50
                  py-3
                  rounded-xl
                  font-semibold
                "


              >



                {

                  importing ? (


                    <>


                      <FaSpinner

                        className="
                          animate-spin
                        "

                      />


                      Importing...


                    </>


                  ) : (


                    <>


                      <FaUpload/>


                      Import Students


                    </>


                  )

                }




              </button>
                            {
                importResult && (


                  <div

                    className="
                      mt-6
                      space-y-4
                    "

                  >




                    <div

                      className="
                        bg-green-600/20
                        border
                        border-green-500/30
                        rounded-xl
                        p-4
                      "

                    >



                      <div

                        className="
                          flex
                          items-center
                          gap-2
                          text-green-400
                          font-semibold
                          mb-3
                        "

                      >

                        <FaCheckCircle/>

                        Import Completed


                      </div>





                      <div

                        className="
                          grid
                          grid-cols-3
                          gap-3
                          text-center
                        "

                      >



                        <div

                          className="
                            bg-white/5
                            rounded-lg
                            p-3
                          "

                        >

                          <p className="text-gray-400 text-xs">

                            Total Rows

                          </p>


                          <p className="text-lg font-bold">

                            {
                              importResult.summary.totalRows
                            }

                          </p>


                        </div>







                        <div

                          className="
                            bg-white/5
                            rounded-lg
                            p-3
                          "

                        >

                          <p className="text-gray-400 text-xs">

                            Imported

                          </p>


                          <p className="text-lg font-bold text-green-400">

                            {
                              importResult.summary.imported
                            }

                          </p>


                        </div>








                        <div

                          className="
                            bg-white/5
                            rounded-lg
                            p-3
                          "

                        >

                          <p className="text-gray-400 text-xs">

                            Skipped

                          </p>


                          <p className="text-lg font-bold text-red-400">

                            {
                              importResult.summary.skipped
                            }

                          </p>


                        </div>





                      </div>



                    </div>









                    {
                      importResult.skippedStudents?.length > 0 && (


                        <div

                          className="
                            bg-red-600/10
                            border
                            border-red-500/20
                            rounded-xl
                            p-4
                            max-h-60
                            overflow-y-auto
                          "

                        >



                          <h3

                            className="
                              font-semibold
                              text-red-400
                              mb-3
                            "

                          >

                            Skipped Students


                          </h3>







                          {

                            importResult.skippedStudents.map(

                              (item,index)=>(


                                <div

                                  key={index}

                                  className="
                                    border-b
                                    border-white/10
                                    py-3
                                    text-sm
                                  "

                                >



                                  <p className="text-white">

                                    {
                                      item.student?.firstName
                                    }

                                    {" "}

                                    {
                                      item.student?.lastName
                                    }


                                  </p>




                                  <p className="text-gray-400">


                                    Reason:

                                    {" "}

                                    {
                                      item.reason
                                    }


                                  </p>




                                </div>



                              )

                            )

                          }





                        </div>


                      )

                    }






                    <button


                      onClick={() => {


                        setShowModal(false);


                        setImportResult(null);


                      }}



                      className="
                        w-full
                        bg-gray-700
                        hover:bg-gray-600
                        py-3
                        rounded-xl
                      "


                    >


                      Close


                    </button>




                  </div>


                )

              }





            </div>


          </div>


        )

      }



    </>

  );


}





export default BulkImportStudents;
