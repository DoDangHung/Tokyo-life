/** @format */

app.controller(
  "ProductController",
  function ($rootScope, $timeout, $scope, $location, DataServices, APIService) {
    $rootScope.title = "Quản Lý Sản Phẩm";

    const token = localStorage.getItem("token");
    const headers = {
      Authorization: "Bearer " + token,
    };

    $scope.products = [];
    $scope.categories = [];
    $scope.currentPage = 1;
    $scope.itemsPerPage = 5;
    $scope.pages = [];

    DataServices.getAllCategory().then(function (response) {
      $scope.categories = response;
    });

    DataServices.getAllProduct().then(function (response) {
      $scope.products = response;

      $scope.products.sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      $scope.products.forEach(function (product) {
        product.isFlashSale = product.isFlashSale ? true : false;
      });

      updateDisplayedProduct();
    });

    function updateDisplayedProduct() {
      var startIndex = ($scope.currentPage - 1) * $scope.itemsPerPage;
      var endIndex = startIndex + $scope.itemsPerPage;
      $scope.displayedProducts = $scope.products.slice(startIndex, endIndex);

      // Tính toán số trang
      $scope.pages = [];
      var totalPages = Math.ceil($scope.products.length / $scope.itemsPerPage);
      for (var i = 1; i <= totalPages; i++) {
        $scope.pages.push(i);
      }
    }

    $scope.setCurrentPage = function (page) {
      $scope.currentPage = page;
      updateDisplayedProduct();
    };

    //thay đổi flash sale
    $scope.changeFlashSale = function (product) {
      var data = {
        isFlashSale: product.isFlashSale,
        pid: product._id,
      };
      APIService.callAPI("product/" + product._id, "PUT", data, headers)
        .then(function (response) {
          swal("Thành Công", "Cập Nhật Thành Công", "success");
        })
        .catch(function (error) {
          console.log(error);
          swal("Error", error.data.mes, "error");
        });
    };

    $scope.variants = [
      {
        color: "",
        size: "",
        quantity: "",
      },
    ];

    // Thêm biến thể
    $scope.addVariant = function () {
      var newVariant = {
        color: "",
        size: "",
        quantity: "",
      };
      $scope.variants.push(newVariant);
    };

    // Thêm mới sản phẩm
    $scope.addProduct = function () {
      swal({
        title: "Đang thêm sản phẩm",
        text: "Vui lòng đợi trong giây lát",
        icon: "info",
        buttons: false,
      });

      // LẤY TOKEN TRƯỚC
      var token = localStorage.getItem("token"); // hoặc sessionStorage.getItem("token")
      if (!token) {
        swal("Lỗi", "Bạn chưa đăng nhập hoặc token đã hết hạn", "error");
        return;
      }

      // TẠO HEADERS MỚI
      var headers = {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      };

      var images = [];
      var files = document.getElementById("images").files;

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!file.type.match("image.*")) {
          continue;
        }
        images.push(file);
      }

      var product = {
        title: $scope.name,
        price: $scope.price,
        sale: $scope.sale || 0,
        description: $scope.description || "Không có mô tả cho sản phẩm này",
        category: $scope.category._id || $scope.category, // dùng _id nếu có object
        variants: $scope.variants,
        isFlashSale: $scope.isFlashSale,
      };

      APIService.callAPI("product", "POST", product, headers)
        .then(function (response) {
          console.log("📦 Response:", response);

          if (!response || !response.data || !response.data.createdProduct) {
            throw new Error("Phản hồi từ API không hợp lệ");
          }

          var pid = response.data.createdProduct._id;

          var formData = new FormData();
          for (var i = 0; i < images.length; i++) {
            formData.append("images", images[i]);
          }

          fetch("http://127.0.0.1:8080/api/product/upload/" + pid, {
            method: "PUT",
            headers: {
              Authorization: "Bearer " + token,
              // ❌ KHÔNG THÊM Content-Type khi dùng FormData
            },
            body: formData,
          })
            .then(function (response) {
              if (!response.ok) {
                throw new Error("Network response was not ok");
              }
              return response.json();
            })
            .then(function (data) {
              swal("Thành Công", "Thêm Sản Phẩm Thành Công", "success");
              $scope.products.push(data.product);
              updateDisplayedProduct();

              $timeout(function () {
                $location.path("/product");
              }, 1000);
            })
            .catch(function (error) {
              console.error("Error:", error);
              swal(
                "Error",
                error.message || "Có lỗi xảy ra khi tải ảnh",
                "error"
              );
            });
        })
        .catch(function (error) {
          console.error("Error:", error);
          swal(
            "Error",
            error.message || "Có lỗi xảy ra khi thêm sản phẩm",
            "error"
          );
        });
    };

    //xoá sản phẩm
    $scope.deleteProduct = function (product) {
      swal({
        title: "Bạn có chắc chắn muốn xóa sản phẩm này?",
        text: "Sau khi xóa, bạn sẽ không thể khôi phục lại sản phẩm này!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      }).then((willDelete) => {
        if (willDelete) {
          APIService.callAPI("product/" + product._id, "DELETE", null, headers)
            .then(function (response) {
              var index = $scope.products.indexOf(product);
              $scope.products.splice(index, 1);
              updateDisplayedProduct();
              swal("Thành Công", "Xóa Sản Phẩm Thành Công", "success");
            })
            .catch(function (error) {
              console.log(error);
              swal("Error", error.data.mes, "error");
            });
        }
      });
    };
  }
);
