import assert from 'assert';
import { XmlParser, xmlText } from "../../src/dom";

describe('HTML', () => {
    it('Trivial', () => {
        const htmlString = '<!DOCTYPE html>' +
        `<html lang="en">
            <head>
                <!-- <meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content=""><meta name="author" content=""> -->
                <title>About - Simple Blog Template</title>
                <!-- Bootstrap Core CSS -->
                <link href="css/bootstrap.min.css" rel="stylesheet">
                <!-- Custom CSS -->
                <link href="css/simple-blog-template.css" rel="stylesheet">
                <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
                <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
                <!--[if lt IE 9]>
                <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
                <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
                <![endif]-->
            </head>
            <body>

                <!-- Navigation -->
                <nav class="navbar navbar-inverse navbar-fixed-top" role="navigation">
                    <div class="container">
                        <!-- Brand and toggle get grouped for better mobile display -->
                        <div class="navbar-header">
                        <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
                            <span class="sr-only">Toggle navigation</span>
                            <span class="icon-bar"></span>
                            <span class="icon-bar"></span>
                            <span class="icon-bar"></span>
                        </button>
                        <a class="navbar-brand" href="index.html">Simple Blog</a>
                        </div>
                        <!-- Collect the nav links, forms, and other content for toggling -->
                        <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
                        <ul class="nav navbar-nav navbar-right">
                            <li>
                            <a href="about.html">About</a>
                            </li>
                            <li>
                            <a href="login.html">Login</a>
                            </li>
                            <li>
                            <a href="signup.html">Sign up</a>
                            </li>
                        </ul>
                        </div>
                        <!-- /.navbar-collapse -->
                    </div>
                <!-- /.container -->
                </nav>


                <!-- Page Content -->
                <div class="container">

                <div class="row">

                    <div class="col-lg-12">

                    <!-- Title -->
                    <h1>About</h1>

                    <hr>

                    <!-- Post Content -->
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus, vero, obcaecati, aut, error quam sapiente nemo saepe quibusdam sit excepturi nam quia corporis eligendi eos magni recusandae laborum minus inventore?</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ut, tenetur natus doloremque laborum quos iste ipsum rerum obcaecati impedit odit illo dolorum ab tempora nihil dicta earum fugiat. Temporibus, voluptatibus.</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eos, doloribus, dolorem iusto blanditiis unde eius illum consequuntur neque dicta incidunt ullam ea hic porro optio ratione repellat perspiciatis. Enim, iure!</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Error, nostrum, aliquid, animi, ut quas placeat totam sunt tempora commodi nihil ullam alias modi dicta saepe minima ab quo voluptatem obcaecati?</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Harum, dolor quis. Sunt, ut, explicabo, aliquam tenetur ratione tempore quidem voluptates cupiditate voluptas illo saepe quaerat numquam recusandae? Qui, necessitatibus, est!</p>

                    <hr>

                    </div>
                </div>
                <!-- /.row -->

                </div>
                <!-- /.container -->

                <!-- Footer -->
                <footer>
                <div class="container">
                    <div class="row">
                    <div class="col-lg-12">
                        <p>Copyright &copy; Your Website 2014</p>
                    </div>
                    <!-- /.col-lg-12 -->
                    </div>
                    <!-- /.row -->
                </div>
                </footer>

                <!-- jQuery -->
                <!-- <script src="js/jquery.js"></script> -->

                <!-- Bootstrap Core JavaScript -->
                <!-- <script src="js/bootstrap.min.js"></script> -->

            </body>
        </html>
        `;

        const xmlParser = new XmlParser();
        const parsedHtml = xmlParser.xmlParse(htmlString);
        const outHtmlString = xmlText(parsedHtml, {
            cData: true,
            selfClosingTags: false,
            escape: true,
            outputMethod: 'html'
        });

        // Uncomment to see the result.
        // console.log(outHtmlString);
        assert.ok(outHtmlString);
    });
});
