import Axios from "axios";
import Notification from "../../components/Notification";
import React, { Fragment, useRef, useState } from "react";
import { Form, FormGroup, Input } from "reactstrap";
import SimpleReactValidator from "simple-react-validator";
import { slackLog } from "../../utils/funcs";
import { defaultDNS } from "../../utils/funcs";
import { cloudflareToken } from "../../utils/funcs";
import { defaultNameServers } from "../../utils/funcs";
// import { nameServers } from "utils/funcs";
import { routeConstants } from "../../utils/funcs";
import { apiUrl } from "../../utils/funcs";

const Step1 = (props) => {
  /* state start */
  const [apiResponse, setApiResponse] = useState({
    error: false,
    success: false,
    errorMessage: "",
    successMessage: "",
  });
  const [step1Data, setStep1Data] = useState({
    domain: "",
  });
  const [loading, setLoading] = useState({
    status: false,
    text: "",
  });
  const [, forceUpdate] = useState();
  /* state end */

  const FormValidator = useRef(
    new SimpleReactValidator({
      className: "text-danger font-weight-bold",
    })
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!FormValidator.current.allValid()) {
      FormValidator.current.showMessages();
      forceUpdate(1);
    } else {
      setApiResponse({
        error: false,
        success: false,
      });
      createDomain();
    }
  };

  const createDomain = () => {
    setLoading({ status: true, text: "Creating domain..." });
    let formData = {
      name: step1Data.domain,
      jump_start: true,
    };
    Axios({
      method: "post",
      url: `${apiUrl}/${routeConstants.zones.create}`,
      data: JSON.stringify(formData),
      headers: {
        Authorization: `Bearer ${cloudflareToken}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          const { id, name_servers, original_name_servers } = data.result;

          let nameServersMatch = original_name_servers.some(
            (x) => name_servers.includes(x) >= name_servers.length-1
          );

          if (nameServersMatch) {
            setTimeout(() => {
              fetchAndDeleteDNS(id);
            }, 30000);
            setLoading({
              status: true,
              text: "Fetching A, AAAA, CNAME Records",
            });
          } else {

            // delete zone if name servers are required to add
            deleteDomain(id);

            setApiResponse({
              error: true,
              errorMessage: (
                <Fragment>
                Please set your name server before attempting to activate a domain name. Required name servers are
                <br/>
                  {
                    name_servers.map(x => (
                      <span className="name-servers">
                        <b>
                          {x}
                        </b>
                        <br/>
                      </span>
                    ))
                  }
                </Fragment>
              ),
              requiredNameServers: name_servers.join(', ') 
            });
            setLoading({
              status: false,
            });
            
          }
        }
      })
      .catch((error) => {
        const { data } = error.response;
        setApiResponse({
          ...apiResponse,
          error: true,
          errorMessage: data.errors[0].message,
        });

        setLoading({ status: false });
      });
  };

  const fetchAndDeleteDNS = (zone_id) => {
    Axios.get(`${apiUrl}/zones/${zone_id}/dns_records?per_page=500`, {
      headers: {
        Authorization: `Bearer ${cloudflareToken}`,
      },
    })
      .then(async (response) => {
        const { data } = response;

        if (data.success) {
          // Check if any of the A, AAAA, CNAME records points at @ or www.
          const { result } = data;
          let dnsToDelete = [];

          result.map((x) => {
            // console.log("x", x);
            if (
              ((x.type === "A" || x.type === "AAAA" || x.type === "CNAME") &&
                x.name == step1Data.domain) ||
              x.name == `www.${step1Data.domain}` ||
              x.name == "www"
            ) {
              // Delete them
              dnsToDelete.push(
                `${apiUrl}/zones/${zone_id}/dns_records/${x.id}`
              );
            }
          });

          setLoading({
            status: true,
            text: "Deleting A, AAAA, CNAME Records",
          });

          await Axios.all(
            dnsToDelete.map((x) =>
              Axios.delete(x, {
                headers: {
                  Authorization: `Bearer ${cloudflareToken}`,
                },
              })
            )
          )
            .then((result) => {
              const { data } = result;

              // console.log("axios delete all", data);

              createDNSRecord(zone_id);
            })
            .catch((e) => {
              const { data } = e.response;
              // console.log("err", e);
              // setHasError({ msg: e.data });
              setApiResponse({
                ...apiResponse,
                error: true,
                errorMessage: data.errors[0].message,
              });
            });
          // .finally(() => {
          //   setLoading({ status: false });
          // });
        }
      })
      .catch((error) => {
        const { data } = error.response;
        // console.log("error", data);
        setApiResponse({
          ...apiResponse,
          error: true,
          errorMessage: data.errors[0].message,
        });

        slackLog({
          text: `Domain: ${step1Data.domain} ${data.errors[0].message}`,
        });
      });
    // .finally(() => {
    //   setLoading({ status: false });
    // });
  };

  const createDNSRecord = async (zone_id) => {
    setLoading({ status: true, text: "Creating DNS Records" });

    // @
    Axios({
      method: "post",
      url: `${apiUrl}/zones/${zone_id}/dns_records`,
      data: JSON.stringify(defaultDNS(step1Data.domain, "@")),
      headers: {
        Authorization: `Bearer ${cloudflareToken}`,
        "Content-Type": "application/json",
      },
    })
      .then((dnsCreated) => {
        const { data } = dnsCreated;
        // console.log("DNS added successfully!!", data);
      })
      .catch((dnsError) => {
        const { data } = dnsError.response;
        // console.log("DNS error", data);
        // setHasError({ msg: data.errors[0].message });
        let msg;
        if (data.errors[0].code === 81053) {
          msg = "A CNAME record with @ already exists.";
        } else {
          msg = data.errors[0].message;
        }

        setApiResponse({
          ...apiResponse,
          error: true,
          errorMessage: `${msg}. Please try again in few minutes.`,
        });

        slackLog({
          text: `Domain: ${step1Data.domain} ${msg}`,
        });

        deleteDomain(zone_id)
      });

    // WWW
    Axios({
      method: "post",
      url: `${apiUrl}/zones/${zone_id}/dns_records`,
      data: JSON.stringify(defaultDNS(step1Data.domain, "www")),
      headers: {
        Authorization: `Bearer ${cloudflareToken}`,
        "Content-Type": "application/json",
      },
    })
      .then((dnsCreated) => {
        const { data } = dnsCreated;
        // console.log("DNS added successfully!!", data);
        applyDNSSettings(zone_id);
      })
      .catch((dnsError) => {
        const { data } = dnsError.response;
        // console.log("DNS error", data);
        // setHasError({ msg: data.errors[0].message });
        let msg;
        if (data.errors[0].code === 81053) {
          msg = "A CNAME record with www already exists.";
        } else {
          msg = data.errors[0].message;
        }
        setApiResponse({
          ...apiResponse,
          error: true,
          errorMessage: msg,
        });

        slackLog({
          text: `Domain: ${step1Data.domain} ${msg}`,
        });

        setLoading({ status: false });
      });

    // await Axios.all(
    //   ["@", "www"].map((x) =>
    //     Axios({
    //       method: "post",
    //       url: `${apiUrl}/zones/${zone_id}/dns_records`,
    //       data: JSON.stringify(defaultDNS(step1Data.domain, x)),
    //       headers: {
    //         Authorization: `Bearer ${cloudflareToken}`,
    //         "Content-Type": "application/json",
    //       },
    //     })
    //   )
    // )
    //   .then((dnsCreated) => {
    //     const { data } = dnsCreated;
    //     console.log("DNS added successfully!!", data);
    //     applyDNSSettings(zone_id);
    //   })
    //   .catch((dnsError) => {
    //     const { data } = dnsError.response;
    //     console.log("DNS error", dnsError.request.config);
    //     // // setHasError({ msg: data.errors[0].message });
    //     // let msg;
    //     // if (data.errors[0].code === 81053) {
    //     //   msg = "A CNAME record with www already exists.";
    //     // } else {
    //     //   msg = data.errors[0].message;
    //     // }
    //     // setApiResponse({
    //     //   ...apiResponse,
    //     //   error: true,
    //     //   errorMessage: msg,
    //     // });
    //     slackLog({
    //       text: `Domain: ${step1Data.domain} `,
    //     });
    //   });
  };

  const applyDNSSettings = (zone_id) => {
    setLoading({
      status: true,
      text: "Applying SSL Settings, Rocket loader..",
    });

    let settings = [
      `${apiUrl}/zones/${zone_id}/settings/ssl`,
      `${apiUrl}/zones/${zone_id}/settings/rocket_loader`,
      `${apiUrl}/zones/${zone_id}/settings/always_use_https`,
      `${apiUrl}/zones/${zone_id}/settings/minify`,
    ];

    let getDataByIndex = (index) => {
      if (index === 0) return { value: "full" }; // ssl
      if (index === 1) return { value: "on" }; // rocket loader
      if (index === 2) return { value: "on" }; // always use https
      if (index === 3)
        return {
          value: {
            html: "on",
            css: "on",
            js: "on",
          },
        }; // minify
    };

    Promise.all(
      settings.map((x, i) =>
        Axios.request({
          url: x,
          method: "PATCH",
          data: getDataByIndex(i),
          headers: {
            Authorization: `Bearer ${cloudflareToken}`,
            "Content-Type": "application/json",
          },
        })
      )
    )
      .then((result) => {
        const { data } = result;
        // console.log("settings api success", data);

        slackLog({
          text: `${step1Data.domain} added to Cloudflare successfully!`,
        });
      })
      .catch((error) => {
        // const { data } = error.response;
        // console.log("settings api error", error);
      })
      .finally(() => {
        setLoading({
          status: "completed",
          text: "Domain & DNS records added successfully.",
        });

        setTimeout(() => {
          setLoading({
            status: false,
          });
        }, 1000);

        setApiResponse({
          error: false,
          success: false,
        });

        setStep1Data({
          domain: "",
        });
      });
  };

  const deleteDomain = (id) => {
    Axios.delete(`${apiUrl}/zones/${id}`, {
      headers: {
        Authorization: `Bearer ${cloudflareToken}`,
        'Content-Type':'application/json'
      }
    })

  }

  return (
    <div>
      {apiResponse.error || apiResponse.success ? (
        <div>
          <Notification
            title={apiResponse.errorMessage || apiResponse.successMessage}
          /> 
        </div>
      ) : (
        ""
      )}

      {loading.status ? <p>{loading.text}</p> : null}

      <Form className="mx-auto">
        <FormGroup>
          <label>Domain: (example.com)*</label>
          <Input
            placeholder="domain"
            name="domain"
            type="text"
            disabled={loading.status ? "disabled" : ""}
            onChange={(input) => {
              setStep1Data({
                ...step1Data,
                domain: input.target.value,
              });
            }}
          />
          {FormValidator.current.message(
            "domain",
            step1Data.domain,
            "required"
          )}
        </FormGroup>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading.status ? true : false}
          onClick={(event) => {
            handleSubmit(event);
          }}
        >
          Add domain to Cloudflare
        </button>

        {loading.status === "completed" ? (
          <div className="show-heart"></div>
        ) : null}
      </Form>
    </div>
  );
};

Step1.defaultProps = {
  nextStep: () => {},
};

export default Step1;
