export default function displayError(err , showAlert){
    if (err.response)
        showAlert("error" , err.response?.data?.message || "Server error, please try again later");
    else
        showAlert("error" , "Network error, please try again");
}